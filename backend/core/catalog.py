from .services import point_cost


GAMES = [
    ("Mobile Legends", "mobile-legends", "Server ID required"),
    ("PUBG Mobile", "pubg-mobile", "Character ID only"),
    ("Free Fire", "free-fire", "Player UID only"),
    ("Honor of Kings", "honor-of-kings", "Player ID only"),
    ("Magic Chess Go Go", "magic-chess-gogo", "Server ID required"),
    ("Roblox", "roblox", "Roblox username"),
]


PRODUCTS = [
    ("pubg-mobile", "60", "60", 4200), ("pubg-mobile", "325", "325", 20700),
    ("pubg-mobile", "660", "660", 41500), ("pubg-mobile", "985", "985", 62700),
    ("pubg-mobile", "1320", "1320", 83600), ("pubg-mobile", "1800", "1800", 103500),
    ("pubg-mobile", "2460", "2460", 146500), ("pubg-mobile", "3850 UC (discounted)", "3850 UC (discounted)", 200500),
    ("pubg-mobile", "3850", "3850", 206700), ("pubg-mobile", "5650", "5650", 313500),
    ("pubg-mobile", "8100 UC (discounted)", "8100 UC (discounted)", 392000), ("pubg-mobile", "8100", "8100", 420500),
    ("pubg-mobile", "11950", "11950", 627000), ("pubg-mobile", "16200", "16200", 826700),
    ("pubg-mobile", "Prime (1 Month)", "Prime (1 Month)", 4000), ("pubg-mobile", "First Purchase Pack", "First Purchase Pack", 4100),
    ("pubg-mobile", "Weekly Deal Pack 1", "Weekly Deal Pack 1", 4200), ("pubg-mobile", "Upgradable Firearm Materials Pack", "Upgradable Firearm Materials Pack", 12300),
    ("pubg-mobile", "Prime (3 Months)", "Prime (3 Months)", 11900), ("pubg-mobile", "Weekly Deal Pack 2", "Weekly Deal Pack 2", 12500),
    ("pubg-mobile", "Weekly Mythic Emblem Value Pack", "Weekly Mythic Emblem Value Pack", 12500), ("pubg-mobile", "Mythic Emblem Pack", "Mythic Emblem Pack", 20400),
    ("pubg-mobile", "Prime (6 Months)", "Prime (6 Months)", 23900), ("pubg-mobile", "Elite Pass LV1-50", "Elite Pass LV1-50", 23900),
    ("pubg-mobile", "Prime Plus (1 Month)", "Prime Plus (1 Month)", 39800), ("pubg-mobile", "Prime (12 Months)", "Prime (12 Months)", 47700),
    ("pubg-mobile", "Elite Pass LV1-100", "Elite Pass LV1-100", 48300), ("pubg-mobile", "Elite Pass Plus LV1-100", "Elite Pass Plus LV1-100", 108300),
    ("pubg-mobile", "Prime Plus (3 Months)", "Prime Plus (3 Months)", 119200), ("pubg-mobile", "Prime Plus (6 Months)", "Prime Plus (6 Months)", 234800),
    ("pubg-mobile", "Prime Plus (12 Months)", "Prime Plus (12 Months)", 474100),
    ("mobile-legends", "55", "55", 3400), ("mobile-legends", "86", "86", 5300),
    ("mobile-legends", "165", "165", 10000), ("mobile-legends", "172", "172", 10500),
    ("mobile-legends", "257", "257", 15100), ("mobile-legends", "275", "275", 16100),
    ("mobile-legends", "343", "343", 20300), ("mobile-legends", "344", "344", 21000),
    ("mobile-legends", "429", "429", 25600), ("mobile-legends", "430", "430", 26300),
    ("mobile-legends", "514", "514", 30100), ("mobile-legends", "516", "516", 31500),
    ("mobile-legends", "565", "565", 33100), ("mobile-legends", "600", "600", 35400),
    ("mobile-legends", "602", "602", 36800), ("mobile-legends", "706", "706", 41300),
    ("mobile-legends", "792", "792", 46600), ("mobile-legends", "878", "878", 51800),
    ("mobile-legends", "963", "963", 56400), ("mobile-legends", "964", "964", 57100),
    ("mobile-legends", "1050", "1050", 62300), ("mobile-legends", "1060", "1060", 62700),
    ("mobile-legends", "1136", "1136", 67600), ("mobile-legends", "1222", "1222", 72800),
    ("mobile-legends", "1308", "1308", 78100), ("mobile-legends", "1412", "1412", 82600),
    ("mobile-legends", "1498", "1498", 87900), ("mobile-legends", "1584", "1584", 93100),
    ("mobile-legends", "1670", "1670", 98400), ("mobile-legends", "1756", "1756", 103600),
    ("mobile-legends", "1842", "1842", 108900), ("mobile-legends", "1928", "1928", 114100),
    ("mobile-legends", "2195", "2195", 125000), ("mobile-legends", "2281", "2281", 130300),
    ("mobile-legends", "2367", "2367", 135500), ("mobile-legends", "2453", "2453", 140800),
    ("mobile-legends", "Weekly Elite Pack", "Weekly Elite Pack", 3400), ("mobile-legends", "Weekly", "Weekly", 6500),
    ("mobile-legends", "Monthly Elite Pack", "Monthly Elite Pack", 17000), ("mobile-legends", "Twilight", "Twilight", 34600),
    ("free-fire", "110", "110", 3800), ("free-fire", "341", "341", 11700),
    ("free-fire", "572", "572", 17500), ("free-fire", "1166", "1166", 37400),
    ("free-fire", "2398", "2398", 73000), ("free-fire", "6160", "6160", 174200),
    ("free-fire", "Weekly Lite", "Weekly Lite", 1200), ("free-fire", "Level Up Package - Level 6", "Level Up Package - Level 6", 1300),
    ("free-fire", "Level Up Package - Level 10", "Level Up Package - Level 10", 2100), ("free-fire", "Level Up Package - Level 25", "Level Up Package - Level 25", 2100),
    ("free-fire", "Evo Access 3D", "Evo Access 3D", 2100), ("free-fire", "Level Up Package - Level 20", "Level Up Package - Level 20", 2100),
    ("free-fire", "Level Up Package - Level 15", "Level Up Package - Level 15", 2100), ("free-fire", "Level Up Package - Level 30", "Level Up Package - Level 30", 3400),
    ("free-fire", "Evo Access 7D", "Evo Access 7D", 3400), ("free-fire", "Booyah Pass", "Booyah Pass", 7500),
    ("free-fire", "Weekly Membership", "Weekly Membership", 7500), ("free-fire", "Evo Access 30D", "Evo Access 30D", 10000),
    ("free-fire", "Booyah Pass Premium Plus", "Booyah Pass Premium Plus", 22400), ("free-fire", "Monthly Membership", "Monthly Membership", 37400),
    ("honor-of-kings", "16", "16 Tokens", 800), ("honor-of-kings", "80", "80 Tokens", 3800),
    ("honor-of-kings", "240", "240 Tokens", 11600), ("honor-of-kings", "400", "400 Tokens", 19300),
    ("honor-of-kings", "560", "560 Tokens", 26900), ("honor-of-kings", "830", "830 Tokens", 38500),
    ("honor-of-kings", "1245", "1245 Tokens", 57800), ("honor-of-kings", "2508", "2508 Tokens", 115700),
    ("honor-of-kings", "4180", "4180 Tokens", 192900), ("honor-of-kings", "8360", "8360 Tokens", 385900),
    ("honor-of-kings", "Honor Point Value Pack", "Honor Point Value Pack", 1200), ("honor-of-kings", "Double Token Lucky Bag", "Double Token Lucky Bag", 1200),
    ("honor-of-kings", "Standard Purchase Rebate Pack", "Standard Purchase Rebate Pack", 1200), ("honor-of-kings", "Infernal Shadow Zilong", "Infernal Shadow Zilong", 2100),
    ("honor-of-kings", "Weekly Card", "Weekly Card", 4300), ("honor-of-kings", "Premium Purchase Rebate Pack", "Premium Purchase Rebate Pack", 4700),
    ("honor-of-kings", "Weekly Card Plus", "Weekly Card Plus", 12500),
    ("magic-chess-gogo", "86", "86", 2500), ("magic-chess-gogo", "172", "172", 5000),
    ("magic-chess-gogo", "257", "257", 7500), ("magic-chess-gogo", "Weekly Card", "Weekly Card", 6200),
    ("magic-chess-gogo", "344", "344", 10000), ("magic-chess-gogo", "516", "516", 15000),
    ("magic-chess-gogo", "565", "565", 14500), ("magic-chess-gogo", "706", "706", 21000),
    ("magic-chess-gogo", "1060", "1060", 31500),
    ("roblox", "50 Robux", "50", 1800), ("roblox", "80 Robux", "80", 2800),
    ("roblox", "100 Robux", "100", 3500), ("roblox", "300 Robux", "300", 10500),
    ("roblox", "500 Robux", "500", 17500), ("roblox", "1000 Robux", "1000", 35000),
]


POINT_REWARDS = [
    ("mlbb-55", "mobile-legends", "55", 0.745, True, "Diamond_Bag.png"),
    ("mlbb-weekly-elite", "mobile-legends", "Weekly Elite Pack", 0.755, True, "weeklypass.png"),
    ("mlbb-86", "mobile-legends", "86", 1.173, True, "Diamond_Bag.png"),
    ("mlbb-weekly", "mobile-legends", "Weekly", 1.448, True, "weeklypass.png"),
    ("mlbb-165", "mobile-legends", "165", 2.224, True, "Diamond.png"),
    ("pubg-60", "pubg-mobile", "60", 0.890, False, "Bit_uc.png"),
    ("pubg-prime-1", "pubg-mobile", "Prime (1 Month)", 0.880, False, "Bit_uc.png"),
    ("pubg-first", "pubg-mobile", "First Purchase Pack", 0.880, False, "Bit_uc.png"),
    ("pubg-weekly-1", "pubg-mobile", "Weekly Deal Pack 1", 0.893, False, "Bit_uc.png"),
    ("pubg-material", "pubg-mobile", "Upgradable Firearm Materials Pack", 2.636, False, "Hexa_Uc.png"),
    ("magic-86", "magic-chess-gogo", "86", 1.193, True, "m diamond.png"),
    ("magic-weekly", "magic-chess-gogo", "Weekly Card", 1.907, True, "weeklypass.png"),
    ("hok-16", "honor-of-kings", "16", 0.173, False, "Token.png"),
    ("hok-honor", "honor-of-kings", "Honor Point Value Pack", 0.265, False, "Token.png"),
    ("hok-lucky", "honor-of-kings", "Double Token Lucky Bag", 0.265, False, "Token.png"),
    ("hok-rebate", "honor-of-kings", "Standard Purchase Rebate Pack", 0.265, False, "Token.png"),
    ("hok-zilong", "honor-of-kings", "Infernal Shadow Zilong", 0.469, False, "TokenSSSS.png"),
    ("ff-weekly-lite", "free-fire", "Weekly Lite", 0.255, False, "freeF_Dia.png"),
    ("ff-level-6", "free-fire", "Level Up Package - Level 6", 0.275, False, "freeF_Dia.png"),
    ("ff-level-10", "free-fire", "Level Up Package - Level 10", 0.459, False, "freeF_Dia.png"),
    ("ff-level-25", "free-fire", "Level Up Package - Level 25", 0.459, False, "freeF_Dia.png"),
    ("ff-evo-3", "free-fire", "Evo Access 3D", 0.459, False, "freeF_Dia.png"),
]


def category_for(title):
    lowered = title.lower()
    if any(word in lowered for word in ["weekly", "monthly", "prime", "pass", "card"]):
        return "Pass"
    if any(word in lowered for word in ["pack", "bundle", "access", "rebate", "zilong", "material"]):
        return "Bundle"
    return "Currency"


def sku_for(slug, title):
    normalized = title.lower().replace("(", "").replace(")", "").replace("+", "plus")
    normalized = "-".join(normalized.replace("/", " ").split())
    return f"{slug.upper()}-{normalized.upper()}"[:80]


def reseller_price(amount):
    return max(0, int(amount * 0.97))


def cost_price(amount):
    return max(0, int(amount * 0.88))


def reward_point_cost(provider_usd):
    return point_cost(provider_usd)
