import { Logger, LogLevel } from '../modules/module.logger.ts'
import BoardGo from '../modules/module.ipvgo.ts'

var logs: Logger
var go: BoardGo
const getTimeSeconds = () => Math.round(performance.now() / 1000)
const opponentsNames = [
  "Netburners", "Slum Snakes", "The Black Hand", "Tetrads", "Daedalus", "Illuminati", "????????????"
]
const practiceName = "No Ai"
const boardSize = [5, 7, 9, 13]
const logListLevel = ['debug', 'info', 'succ', 'warn', 'error']
const argsSchema: [string, string | number | boolean | string[]][] = [
  ['loglevel', 'debug'], ['l', true], ['d', false]
]


export async function main(ns: NS) {
  ns.disableLog('ALL')

  /** --- khởi tạo đầu vào --- */
  const flags = ns.flags(argsSchema) as { loglevel: string, d: boolean, l: boolean }
  const [debug, logEnabled] = [flags.d, flags.l]
  var [loglevel] = [flags.loglevel]

  /** --- thiết lập biến toàn cục --- */
  // thiết lập logger
  if (!logListLevel.includes(loglevel)) loglevel = 'info'
  const logMinLevel = {
    ['debug']: LogLevel.DEBUG,
    ['info']: LogLevel.INFO,
    ['succ']: LogLevel.SUCCESS,
    ['warn']: LogLevel.WARN,
    ['error']: LogLevel.ERROR
  }[loglevel] || loglevel
  logs = new Logger(ns, { enabled: logEnabled, showTimestamp: false, useTerminal: false })
  logs.setLevel(logMinLevel as LogLevel)
  logs.setDebug(debug)

  go = new BoardGo(ns, logs)
  if (logEnabled) { ns.clearLog(); ns.ui.openTail() }

  /** --- biến cục bộ --- */
  var result: {
    type: 'move' | 'pass' | 'gameOver'
    x: number | null
    y: number | null
  }

  // --- -[-vòng lập trính-]- --- //
  try {
    result = await ns.go.opponentNextTurn()
    if (result?.type == 'gameOver') ns.go.resetBoardState(ns.go.getOpponent(), ns.go.getBoardState()[0].length as 5 | 7 | 9 | 13)

    do {
      ns.clearLog()
      const board = go.board
      const valid = go.valid
      go.color

      logs.info(`Board State`)
      go.board2D
      logs.info(`Controlled Empty Nodes`)
      go.controlled2D()
      logs.info(`Liberties`)
      go.liberties2D()
      logs.info(`Chains`)
      go.chains2D()

      // tìm một nước đi từ các tùy chọn
      const [x, y] = go.move_ai

      if (x === undefined) {
        // Bỏ lượt nếu không tìm thấy nước đi nào
        // result = await ns.go.passTurn()
      } else {
        // đề mô nước đi bằng high light
        ns.go.analysis.highlightPoint(x, y, '#FFF000')
        // Chơi nước đi đã chọn
        // result = await ns.go.makeMove(x, y)
      }

      // Ghi lại nước đi tiếp theo của đối thủ, sau khi nó xảy ra
      await ns.go.opponentNextTurn()

      await ns.sleep(500)

      // Tiếp tục lặp lại chừng nào đối thủ còn chơi nước đi
    } while (result?.type !== 'gameOver')
  } catch (error) {
    // bắt lỗi
    logs.error(`${error}`)
  }

}


export function autocomplete(data: AutocompleteData, args: any) {
  data.flags(argsSchema)
  return data.command
}