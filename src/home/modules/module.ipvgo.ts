import BaseGo, { Config } from "modules/module.base-ipvgo.ts"
//import { Logger } from 'modules/module.logger.ts'

export default class BoardGo extends BaseGo {
  constructor(ns: NS, logs: any, config?: Partial<Config>) {
    super(ns, logs, config)
  }

  // 1. Chữ ký Overload 1: Xoay ma trận 2D (T[][])
  private rotateMatrix90<T>(matrixInput: T[][], clockwise?: boolean): string[]

  // 2. Chữ ký Overload 2: Xoay code gốc (String Array - string[])
  private rotateMatrix90(arrInput: string[], clockwise?: boolean): string[]

  // 3. Phần Triển khai (Implementation)
  private rotateMatrix90<T>(matrixInput: T[] | T[][], clockwise: boolean = false): string[] {
    // Để đơn giản, ta sẽ chỉ hỗ trợ T[][] và String Array 
    // và xem xét trường hợp T[] nếu tất cả phần tử của T[] là string.

    // Giả định ma trận là 2D (T[][])
    const arr2D: T[][] = matrixInput as T[][]

    if (arr2D.length === 0 || arr2D[0].length === 0) {
      return []
    }
    const rows: number = arr2D.length
    // Kiểm tra xem đầu vào có phải là Mảng các Chuỗi mà mỗi chuỗi đại diện cho một hàng không.
    // Đây là cách duy nhất để hỗ trợ hành vi của code gốc.
    const isOriginalStringArray = typeof arr2D[0] === 'string'
    const cols: number = isOriginalStringArray ? (arr2D[0] as unknown as string).length : arr2D[0].length
    const paddingLength: number = 2

    const pad = (str: string, totalLength: number = paddingLength): string => {
      return (' '.repeat(totalLength) + str).slice(-totalLength);
    }

    return Array.from({ length: cols }, (_, j: number) =>
      Array.from({ length: rows }, (_, i: number) => {
        let element: T | string | undefined

        if (clockwise) {
          // Vị trí (rows - 1 - i, j)
          const row = arr2D[rows - 1 - i]
          if (row) {
            element = isOriginalStringArray
              ? (row as unknown as string)[j] // Lấy ký tự từ chuỗi (code gốc)
              : row[j]                        // Lấy phần tử từ mảng (ma trận số)
          }
        } else {
          // Vị trí (i, cols - 1 - j)
          const row = arr2D[i]
          if (row) {
            element = isOriginalStringArray
              ? (row as unknown as string)[cols - 1 - j] // Lấy ký tự từ chuỗi (code gốc)
              : row[cols - 1 - j]                        // Lấy phần tử từ mảng (ma trận số)
          }
        }

        if (element === undefined || element === null || element === '') {
          return ' #'
        } else {
          // Chuyển phần tử thành chuỗi (an toàn cho cả number và string)
          const elementString = element.toString()
          return pad(elementString)
        }
      }).join(' ')
    )
  }

  private controlledEmptyNodes(b?: string[]) { return this.ns.go.analysis.getControlledEmptyNodes(b) }
  private liberties(b?: string[]) { return this.ns.go.analysis.getLiberties(b) }
  private chains(b?: string[]) { return this.ns.go.analysis.getChains(b) }

  //** --- các hàm tính toán nước đi --- **//
  get move_ai() { return this.auto_move() }

  /**
   * @param controlled2D print controlled 2D xoay 90 độ
   */
  public controlled2D(b?: string[]) { return this.logs.success(this.rotateMatrix90(this.controlledEmptyNodes(b), false).join("\n")) }
  /**
   * @param liberties2D print liberties 2D xoay 90 độ
   */
  public liberties2D(b?: string[]) { return this.logs.success(this.rotateMatrix90(this.liberties(b), false).join("\n")) }
  /**
   * @param chains2D print chains 2D xoay 90 độ
   */
  public chains2D(b?: string[]) { return this.logs.success(this.rotateMatrix90(this.chains(b), false).join("\n")) }
  /**
   * @param board2D print board 2D xoay 90 độ
   */
  get board2D() { return this.logs.success(this.rotateMatrix90(this.board_state || this.board, false).join("\n")) }
  //** --- get borad --- **//
  get board() { this.board_state = this.ns.go.getBoardState(); return this.board_state }
  //** --- get valid --- **//
  get valid() { this.valid_moves = this.ns.go.analysis.getValidMoves(); return this.valid_moves }
  //** --- set màu quân cờ của player --- **//
  get color() { this.my_color = this.player_color(this.ns.go.getCurrentPlayer()); return this.my_color }
}