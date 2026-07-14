/**
 * 拓扑解析器
 * 将电路元件和连线解析为有向图，支持DFS连通性检测和路径查找
 */

export class Topology {
  constructor() {
    this.nodes = new Map()   // nodeId -> { component, pin }
    this.edges = []          // { from, to, wire }
    this.adjacency = new Map() // nodeId -> Set<nodeId>
  }

  /**
   * 从实验配置构建拓扑图
   * @param {Object} canvas - 实验配置中的canvas对象
   */
  build(canvas) {
    this.nodes.clear()
    this.edges = []
    this.adjacency.clear()

    // 注册所有元件引脚为节点，并添加元件内部引脚连通
    for (const comp of canvas.components) {
      const def = getComponentDef(comp.type)
      if (!def) continue
      for (const pin of def.pins) {
        const nodeId = this._pinId(comp.id, pin)
        this.nodes.set(nodeId, { component: comp, pin })
        if (!this.adjacency.has(nodeId)) {
          this.adjacency.set(nodeId, new Set())
        }
      }
      // 元件内部引脚互通（电流从一端进另一端出）
      if (def.pins.length >= 2) {
        for (let i = 0; i < def.pins.length; i++) {
          for (let j = i + 1; j < def.pins.length; j++) {
            const pinA = this._pinId(comp.id, def.pins[i])
            const pinB = this._pinId(comp.id, def.pins[j])
            this.adjacency.get(pinA).add(pinB)
            this.adjacency.get(pinB).add(pinA)
          }
        }
      }
    }

    // 处理连线
    for (const wire of canvas.wires) {
      const [fromPin, toPin] = this._parseWire(wire)
      if (this.nodes.has(fromPin) && this.nodes.has(toPin)) {
        this.edges.push({ from: fromPin, to: toPin, wire })
        this.adjacency.get(fromPin).add(toPin)
        this.adjacency.get(toPin).add(fromPin)
      }
    }

    return this
  }

  /**
   * 解析连线格式 ["V1+", "R1.1"] 或 ["V1.+", "R1.1"] 或 {from: "V1.+", to: "R1.1"}
   */
  _parseWire(wire) {
    const fromRaw = Array.isArray(wire) ? wire[0] : wire.from
    const toRaw = Array.isArray(wire) ? wire[1] : wire.to
    const from = this._normalizePin(fromRaw)
    const to = this._normalizePin(toRaw)
    return [from, to]
  }

  /**
   * 标准化引脚标识: "V1+" -> "V1.+", "R1.1" -> "R1.1"
   */
  _normalizePin(pin) {
    if (pin.includes('.')) return pin
    // 最后一个字符是引脚名
    const last = pin.slice(-1)
    const compId = pin.slice(0, -1)
    return `${compId}.${last}`
  }

  _pinId(compId, pin) {
    return `${compId}.${pin}`
  }

  /**
   * DFS查找从start到end的路径
   * @returns {Array|null} 路径上的nodeId数组，或null
   */
  findPath(start, end) {
    const visited = new Set()
    const path = []

    const dfs = (current) => {
      visited.add(current)
      path.push(current)

      if (current === end) return true

      const neighbors = this.adjacency.get(current)
      if (neighbors) {
        for (const next of neighbors) {
          if (!visited.has(next)) {
            if (dfs(next)) return true
          }
        }
      }

      path.pop()
      return false
    }

    return dfs(start) ? [...path] : null
  }

  /**
   * 查找包含指定元件ID的所有路径（从电源正极到地）
   * @param {string} powerPosId - 电源正极节点ID (如 "V1.+")
   * @param {string} gndId - 地节点ID (如 "G1.gnd")
   * @returns {Array} 路径数组
   */
  findAllPaths(powerPosId, gndId) {
    const allPaths = []
    const visited = new Set()

    const dfs = (current, path) => {
      if (current === gndId) {
        allPaths.push([...path])
        return
      }

      visited.add(current)
      const neighbors = this.adjacency.get(current)
      if (neighbors) {
        for (const next of neighbors) {
          if (!visited.has(next)) {
            dfs(next, [...path, next])
          }
        }
      }
      visited.delete(current)
    }

    dfs(powerPosId, [powerPosId])
    return allPaths
  }

  /**
   * 检查两个节点是否连通
   */
  isConnected(nodeA, nodeB) {
    return this.findPath(nodeA, nodeB) !== null
  }

  /**
   * 获取路径上的所有元件
   * @param {Array} path - nodeId数组
   * @returns {Array} 元件对象数组（去重，保留顺序）
   */
  getComponentsInPath(path) {
    const seen = new Set()
    const components = []
    for (const nodeId of path) {
      const nodeInfo = this.nodes.get(nodeId)
      if (nodeInfo && !seen.has(nodeInfo.component.id)) {
        seen.add(nodeInfo.component.id)
        components.push(nodeInfo.component)
      }
    }
    return components
  }
}

/**
 * 组件定义注册表
 */
const componentRegistry = new Map()

export function registerComponent(type, definition) {
  componentRegistry.set(type, definition)
}

export function getComponentDef(type) {
  return componentRegistry.get(type)
}
