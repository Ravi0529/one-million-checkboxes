export const TOGGLE_CHECKBOX_LUA = `
local bitmapKey = KEYS[1]
local ownerKey = KEYS[2]

local checkboxId = tonumber(ARGV[1])
local userId = ARGV[2]
local checked = tonumber(ARGV[3])

local currentOwner = redis.call("GET", ownerKey)

-- CHECK
if checked == 1 then
    if not currentOwner then
        redis.call("SET", ownerKey, userId)
        redis.call("SETBIT", bitmapKey, checkboxId, 1)
        return 1
    else
        return 0
    end
end

-- UNCHECK
if checked == 0 then
    if currentOwner == userId then
        redis.call("DEL", ownerKey)
        redis.call("SETBIT", bitmapKey, checkboxId, 0)
        return 1
    else
        return 0
    end
end

return 0
`;
