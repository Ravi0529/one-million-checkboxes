export const TOGGLE_CHECKBOX_LUA = `
local bitmapKey = KEYS[1]
local ownerKey = KEYS[2]

local checkboxId = tonumber(ARGV[1])
local userId = tostring(ARGV[2])

-- current bit
local current = redis.call("GETBIT", bitmapKey, checkboxId)

-- CASE 1: unchecked → allow check
if current == 0 then
    redis.call("SETBIT", bitmapKey, checkboxId, 1)
    redis.call("SET", ownerKey, userId)
    return {1, userId}
end

-- CASE 2: checked → check owner
local owner = redis.call("GET", ownerKey)

-- normalize
if owner then
    owner = tostring(owner)
end

if owner and owner == userId then
    -- allow uncheck
    redis.call("SETBIT", bitmapKey, checkboxId, 0)
    redis.call("DEL", ownerKey)
    return {0, userId}
end

-- ❌ reject
return {current, owner, userId}
`;
