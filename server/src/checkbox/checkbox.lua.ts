export const TOGGLE_CHECKBOX_LUA = `
local bitmapKey = KEYS[1]
local ownerKey = KEYS[2]
local countKey = KEYS[3]

local checkboxId = tonumber(ARGV[1])
local userId = tostring(ARGV[2])

local current = redis.call("GETBIT", bitmapKey, checkboxId)

if current == 0 then
    redis.call("SETBIT", bitmapKey, checkboxId, 1)
    redis.call("SET", ownerKey, userId)
    redis.call("INCR", countKey)
    return {1, userId}
end

local owner = redis.call("GET", ownerKey)

if owner then
    owner = tostring(owner)
end

if owner and owner == userId then
    redis.call("SETBIT", bitmapKey, checkboxId, 0)
    redis.call("DEL", ownerKey)
    redis.call("DECR", countKey)
    return {0, userId}
end

return {-1, owner or ""}
`;
