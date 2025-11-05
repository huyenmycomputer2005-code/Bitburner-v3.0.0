import { Logger } from 'modules/module.logger.ts'

export interface Config {
  debug: boolean
}

export default class BaseGo {
  constructor(ns: NS, logs: Logger, config?: Partial<Config>) {
    this.ns = ns
    this.config = {
      debug: logs.isDebug || false,
      ...config
    }
    this.logs = logs
    this.board_state = null
    this.valid_moves = null
    this.my_color = null
  }

  public ns: NS
  private config: Config
  public logs: Logger
  public board_state: string[] | null
  public valid_moves: boolean[][] | null
  public my_color: 'X' | 'O' | null


  public player_color(piece: "Black" | "White" | "None") {
    switch (piece) {
      case 'Black':
        return 'X'
      case 'White':
        return 'O'
      case 'None':
        return null
    }
  }


  //** --- Tiện ích. Lấy danh sách các tọa độ có thể dùng --- **//
  private avite_options(): number[][] {
    if (!this.board_state) throw new Error(`board_state is not null`)
    if (!this.valid_moves) throw new Error(`valid_moves is not null`)

    const size = this.board_state[0].length
    const move_options: number[][] = []
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (this.valid_moves[x][y]) move_options.push([x, y])
      }
    }
    return move_options || []
  }
  //** --- Tiện ích. Hàm mô phỏng nước đi --- **//
  private simulateMove(board: string[], x: number, y: number, player: string | null): string[] {
    if (!player) return []

    const newBoard = board.map(row => row.split(''))
    newBoard[x][y] = player
    return newBoard.map(row => row.join(''))
  }
  //** --- Tiện ích. Hàm xác định các quân bị bắt --- **//
  private getCapturedStones(board: string[], player: string | null): number[][] {
    if (!player) return []

    const size = board[0].length
    const visited = Array.from({ length: size }, () => Array(size).fill(false))
    const captured: number[][] = []

    function hasLiberty(x: number, y: number, color: string, group: number[][]): boolean {
      if (x < 0 || y < 0 || x >= size || y >= size) return false
      if (visited[x][y]) return false
      visited[x][y] = true

      if (board[x][y] === '.') return true // ô trống => có khí
      if (board[x][y] !== color) return false

      group.push([x, y])
      // kiểm tra 4 hướng
      return (
        hasLiberty(x - 1, y, color, group) ||
        hasLiberty(x + 1, y, color, group) ||
        hasLiberty(x, y - 1, color, group) ||
        hasLiberty(x, y + 1, color, group)
      )
    }

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (board[x][y] === player && !visited[x][y]) {
          const group: number[][] = []
          const hasAir = hasLiberty(x, y, player, group)
          if (!hasAir) captured.push(...group)
        }
      }
    }
    return captured
  }


  //** --- 1. Bắt quân --- *//
  private attack(): number[] {
    if (!this.board_state) throw new Error(`board_state is not null`)
    if (!this.valid_moves) throw new Error(`valid_moves is not null`)

    const move_options = this.avite_options()
    for (const [x, y] of move_options) {
      const newboard = this.simulateMove(this.board_state, x, y, this.my_color)
      const captured = this.getCapturedStones(newboard, this.my_color)
    }
    return []
  }


  //** --- 2. Gần quân --- *//
  private def_move(): number[] {
    if (!this.board_state) throw new Error(`board_state is not null`)
    if (!this.valid_moves) throw new Error(`valid_moves is not null`)

    const size = this.board_state[0].length
    const moveOptions = this.avite_options()
    if (moveOptions.length === 0) return []

    const myStones: number[][] = []
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (this.board_state[x][y] === this.my_color) myStones.push([x, y])
      }
    }

    let bestMove: number[] = []
    let minDist = Infinity
    for (const [x, y] of moveOptions) {
      for (const [sx, sy] of myStones) {
        const dist = Math.abs(x - sx) + Math.abs(y - sy)
        if (dist < minDist) {
          minDist = dist
          bestMove = [x, y]
        }
      }
    }
    return bestMove || []
  }


  //** --- 3. Gần trung tâm --- **//
  private ttam_move(): number[] {
    if (!this.board_state) throw new Error(`board_state is not null`)
    if (!this.valid_moves) throw new Error(`valid_moves is not null`)

    const size = this.board_state[0].length
    const moveOptions = this.avite_options()
    const center = Math.floor(size / 2)

    moveOptions.sort((a, b) => {
      const da = Math.abs(a[0] - center) + Math.abs(a[1] - center)
      const db = Math.abs(b[0] - center) + Math.abs(b[1] - center)
      return da - db
    })
    return moveOptions[0] || []
  }


  //** --- 4. Ngẩu nhiên --- **//
  private random_move(): number[] {
    if (!this.board_state) throw new Error(`board_state is not null`)
    if (!this.valid_moves) throw new Error(`valid_moves is not null`)

    const move_options = this.avite_options()
    if (move_options.length === 0) return []
    const acti_options: number[][] = []

    for (const [x, y] of move_options) {
      const isValidMove = this.valid_moves[x][y] === true
      const isNotReservedSpace = x % 2 === 1 || y % 2 === 1
      if (isValidMove && isNotReservedSpace) {
        acti_options.push([x, y])
      }
    }
    const randomIndex = Math.floor(Math.random() * acti_options.length)
    return acti_options[randomIndex] || []
  }


  //** --- AI.1 Tự động tìm nước đi tốt --- **//
  public auto_move(): number[] {
    // 1 bắt quân
    const attack: number[] = this.attack()
    if (attack.length !== 0) { if (this.config.debug) { this.logs.debug(`[attack] ${attack}`) }; return attack }
    // 2 phòng thủ
    const deff: number[] = this.def_move()
    if (deff.length !== 0) { if (this.config.debug) { this.logs.debug(`[deff] ${deff}`) }; return deff }
    // 3 trung tâm
    const ttam: number[] = this.ttam_move()
    if (ttam.length !== 0) { if (this.config.debug) { this.logs.debug(`[ttam] ${ttam}`) }; return ttam }
    // 4 ngẩu nhiên
    const random: number[] = this.random_move()
    if (random.length !== 0) { if (this.config.debug) { this.logs.debug(`[rand] ${random}`) }; return random }
    // Không có nước đi nào
    return []
  }
}