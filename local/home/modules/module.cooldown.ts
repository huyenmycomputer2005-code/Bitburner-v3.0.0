// module.cooldown.ts
// Simple in-memory cooldown manager for targets (keeps map target -> expireTimestamp ms)

const cooldowns: Map<string, number> = new Map()

/**
 * Đặt cooldown cho target tới thời điểm `expireAt` (timestamp ms).
 * Nếu expireAt <= Date.now() thì coi như không đặt.
 */
export function setCooldown(target: string, expireAt: number): void {
  if (!target) return
  if (expireAt <= Date.now()) {
    cooldowns.delete(target)
    return
  }
  cooldowns.set(target, expireAt)
}

/**
 * Kiểm tra target còn đang cooldown không.
 * Trả về true nếu vẫn còn (expire > now).
 */
export function isOnCooldown(target: string): boolean {
  const t = cooldowns.get(target)
  if (!t) return false
  if (t <= Date.now()) {
    cooldowns.delete(target)
    return false
  }
  return true
}

/**
 * Trả về thời gian còn lại (ms). Nếu không có cooldown trả về 0.
 */
export function getCooldownRemaining(target: string): number {
  const t = cooldowns.get(target)
  if (!t) return 0
  const remain = t - Date.now()
  if (remain <= 0) {
    cooldowns.delete(target)
    return 0
  }
  return remain
}

/**
 * Xóa cooldown cho target (manual clear).
 */
export function clearCooldown(target: string): void {
  cooldowns.delete(target)
}

/**
 * Dọn map, xóa các target đã hết hạn (gọi định kỳ nếu bạn muốn).
 */
export function cleanupExpired(): void {
  const now = Date.now()
  for (const [k, v] of cooldowns.entries()) {
    if (v <= now) cooldowns.delete(k)
  }
}

/**
 * (Optional) trả về snapshot cho debug
 */
export function listCooldowns(): { target: string, expiresInMs: number }[] {
  const now = Date.now()
  const out: { target: string, expiresInMs: number }[] = []
  for (const [k, v] of cooldowns.entries()) {
    const rem = v - now
    if (rem > 0) out.push({ target: k, expiresInMs: rem })
    else cooldowns.delete(k)
  }
  return out
}
