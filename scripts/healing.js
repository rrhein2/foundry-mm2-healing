const healCounterFlag = "healCounter"
const regenRanksFlag = "regenRanks"
const remainderFlag = "remainderVal"
const lastHealedEffect = "lastHealed"
const moduleId = "foundry-mm3-healing"
const moduleName = "MM3 Auto Healing"

const mm3NameToGameID = {
    "incapacitated": "neutralized", 
    "blind": "bind", 
    "asleep": "sleep", 
    "paralyzed": "paralysis", 
    "prone": "prone",
    "staggered": "chanceling",
    "surprised": "surprised",
    "deaf": "deaf",
    "defenseless": "defenseless",
    "controlled": "controlled",
    "stunned": "stunned", 
    "debilitated": "invalid", 
    "immobile": "stuck",
    "unaware": "insensitive",
    "disabled": "disabled",
    "compelled": "eye",
    "dazed": "dazed",
    "weakened": "downgrade",
    "vulnerable": "vulnerability",
    "impaired": "decreased",
    "hindered": "slow",
    "bound": "tied",
    "dying": "dying",
    "entranced": "enthralled",
    "exhausted": "exhausted",
    "restrained": "restrain",
    "transformed": "transformed"
}

const gameIdToMM3Name = {
    "neutralized": "incapacitated",
    "bind": "blind",
    "sleep": "asleep",
    "paralysis": "paralyzed",
    "prone": "prone",
    "chanceling": "staggered",
    "surprised": "surprised",
    "deaf": "deaf",
    "defenseless": "defenseless",
    "controlled": "controlled",
    "stunned": "stunned",
    "invalid": "debilitated",
    "stuck": "immobile",
    "insensitive": "unaware",
    "disabled": "disabled",
    "eye": "compelled",
    "dazed": "dazed",
    "downgrade": "weakened",
    "vulnerability": "vulnerable",
    "decreased": "impaired",
    "slow": "hindered",
    "tied": "bound",
    "dying": "dying",
    "enthralled": "entranced",
    "exhausted": "exhausted",
    "restrain": "restrained",
    "transformed": "transformed"
}

const healableConditionsGameId = ["neutralized", "chanceling", "dazed"]

function removeItemByValue(item, array)
{
    var index = array.indexOf(item);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

function calculateHealFrequency(actor)
{
    let powers = actor.items.filter((item) => item.type == "pouvoir")
    let regenPowers = []
    let totalRegenRanks = 0
    let formulaSelector = "Remainder"
    if(game.settings.get(moduleId, regenRanksFlag) > -1)
    {
        totalRegenRanks = game.settings.get(moduleId, regenRanksFlag)
    }
    for(let power of powers)
    {
        if(power.system.effetsprincipaux.toUpperCase().indexOf("REGENERATION") !== -1)
        {
            regenPowers.push(power)
        }
    }
    for(let regen of regenPowers)
    {
        totalRegenRanks += regen.system.cout.rang
    }

    return totalRegenRanks
}

function generateSimpleHealSelector(actor)
{
    let effectButtons = {}
    let effectCounter = 0
    for(let status of healableConditionsGameId)
    {
        if(game.mm3.hasStatus(actor, status) != undefined)
        {
            effectCounter++
            //let iconUrl = `systems/mutants-and-masterminds-3e/assets/icons/${status.id}.svg`
            let iconUrl = CONFIG.statusEffects.find((se) => se.id == status).icon
            let iconVal = `<img class="heal-selector-button-icon" src="${iconUrl}", style="width: 20px; height: 20px;"></img>`
            effectButtons[`${status}_button`] = {
                label: `<span class="heal-selector-button-text" style="display: block"> ${gameIdToMM3Name[status]} </span>`,
                callback: async () => {
                    ui.notifications.info(`${gameIdToMM3Name[status]} removed`)
                    game.mm3.deleteStatus(actor, status)
                    CONFIG.statusEffects.find((se) => se.id == status).changes?.map((status) => {
                        if(status.key != "dazed")
                        {
                            game.mm3.deleteStatus(actor, status.key)
                        }
                    })
                    await actor.setFlag(moduleId, lastHealedEffect, status)
                },
                //icon: `<i class="fas fa-check"></i>`
                icon: iconVal
            }
        }
    }

    effectButtons["Skip"] = {
        label: `<span class="healing-selector-button-text" style="display: block"> ${"Skip"} </span>`,
        callback: async () => {
            ui.notifications.info('Did not heal a condition')
            await actor.setFlag(moduleId, lastHealedEffect, "none")
        },
        icon: `<img class="heal-selector-button-icon" src="systems/mutants-and-masterminds-3e/assets/icons/defenseless.svg", style="width: 20px; height: 20px;"></img>`
    }
    
    if(effectCounter == 0)
    {
        return undefined
    }
    else{
        return (new Dialog({
            title: "Healing Condition Selector",
            content: "Select a condition: ",
            buttons: effectButtons
        }))
    }
}

function generateComplexHealSelector(actor)
{

}

async function calculateAutoHealing(actor)
{
    let exemptConditions = {
        "bound": ["defenseless", "immobile", "impaired"], 
        "dying": ["all"], 
        "entranced": ["stunned"], 
        "exhausted": ["all"], 
        "restrained": ["hindered", "vulnerable"], 
        "transformed": [], 
        "compelled": [], 
        "controlled": []
    }
    let newStatus
    for(let status of healableConditionsGameId)
    {
        if(game.mm3.hasStatus(actor, status) != undefined)
        {
            newStatus = status
            break
        }
    }
    if(newStatus != undefined)
    {
        game.mm3.deleteStatus(actor, newStatus)
        await actor.setFlag(moduleId, lastHealedEffect, newStatus)
    }
    else
    {
        await actor.setFlag(moduleId, lastHealedEffect, "none")
    }
}

async function handleHealing(actor)
{
    // TODO: Create user (and maybe temp) settings for auto, simple, and complex, and pull that info
    //       from the settings
    let healingOption = "simple"
    let selector;
    let activeEffects = []
    let effectButtons = {}
    if(actor.system.blessure > 0)
    {
        console.log("  inside handleHealing - has bruises")
        await actor.update({"system": {"blessure": actor.system.blessure - 1}})
        console.log(`  inside handleHealing - remaining bruises: ${actor.system.blessure}`)
        return
    }
    if(healingOption == "auto")
    {
        calculateAutoHealing(actor)
    }
    else
    {
        if(healingOption == "simple")
        {
            selector = generateSimpleHealSelector(actor)
        }
        else if(healingOption == "complex")
        {
            // TODO
        }
        else if(healingOption == "chat")
        {
            // TODO: chat prompt user to heal
        }
        else if(healingOption == "off")
        {
            // TODO: do nothing?
        }
    }
    

    if(selector != undefined && selector != null)
    {
        selector.render(true)
    }

}

function shouldActorHeal(regenRanks, newHealCounter, direction, formulaSelector)
{
    // formula for regeneration: you heal X times per minute where X is the number of ranks you have in regeneration
    //   every round is 6 seconds, so 10 rounds to a minute. 10/X is the healing rate, but the decimals pose a possible
    //   problem. I see 2 possible ways to resolve this. I should probably make a setting to choose which one for variability
    //   1) I have another flag for remainder. The remainder is calculated using the heal/round rate, which is the inverse of 
    //      the above formula. E.g. 8 ranks -> 10/8 is  1.25 rounds/heal, or 4/5 heals/round. Using the heals/round, every
    //      round we do the division (4/5). We heal Y number of times for the dividend, then we add the remainder to the
    //      rolling remainder count. When the remainder >= 1, we heal again and subtract 1. To continue the above example of
    //      4/5 heals/round, 4/5 is always .8, so we have Y=0 inherent heals/round. THe .8 gets added to the remainder. The
    //      next round, another .8 is added to the remainder, which is now 1.6, so we heal once, subtract 1, and the rolling
    //      remainder is .6. This allows for >10 regen ranks to work as well, where X=20 would result in a heals/round of 2
    //      so you would heal 2 times every round. It also accounts for odd mixes, like X=15 (3/2 heals/round) which will net
    //      1.5, healing once every round and 2 times every other round. This isn't *completley accurate* in the short-term,
    //      but that's because rounds are treated as indivisible, so we need to cumulate values for it to work.
    //   2) You have "regen points" so that every set of 10 rounds they reset. You can use them on any round you want (with
    //      a max point spend per round of the whole number when doing 10/X), but once you've used them, you have to wait until
    //      the next 10 round cycle to get more. That way we can avoid more complex math, and allow more player choice, while
    //      also maintaining balance
    if(formulaSelector == "Remainder")
    {
        // let newHealCounter = direction > 0 ? 1/(10/regenRanks) + healCounter : healCounter - (1/(10/regenRanks))
        if(newHealCounter >= 1)
        {
            return Math.floor(newHealCounter)
        }
        else if(newHealCounter < 0)
        {
            return Math.floor(newHealCounter)
        }
        return 0

    }
    else if(formulaSelector == "Points")
    {
    }
}

async function handleRemainderBasedHealing(actor, numberOfHeals, currentHealCounter, healPerRound)
{
    // Forward progression: Heal character
    if(numberOfHeals)
    {
        currentHealCounter -= numberOfHeals
        console.log(`Healing ${numberOfHeals} times`)
        while(numberOfHeals > 0)
        {
            handleHealing(actor)
            numberOfHeals--
        }
    }
    // Go back turns: Undo healing of characcter
    else if(numberOfHeals < 0)
    {
        currentHealCounter = numberOfHeals - healPerRound
        console.log(`Unhealing ${numberOfHeals} times`)
        while(numberOfHeals < 0)
        {
            let lastEff = await actor.getFlag(moduleId, lastHealedEffect)
            if(lastEff == "none")
            {
                console.log("Last rotation had nothing to heal, can't unheal that")
            }
            else
            {
                console.log(`unheal: ${lastEff}`)
                game.mm3.setStatus(actor, lastEff)
            }
            numberOfHeals++
        }
    }
    // If this is 0, then no heals happen this turn, but we still need to cumulate the healPerRound value

    console.log(`Number of bruises at end of handleRemainderBasedHealing: ${actor.system.blessure}`)
    return currentHealCounter
}


// This function manages the healCounterFlag data to determine if healing can/should be attempted. What the healCounterFlag
//    contains can differ depending on the settings chosen by the GM/Player
// The actor variable links to the relevant actor (in the case of non-linked tokens, the synthetic actor). 
// The token variable links to the specific token in the combat sequence
// The direction variable is +1 for the turn counter progressing forwards, and -1 for the turn counter going back 1
async function updateHealCounter(actor, direction, token)
{
    console.log(`Update Heal Counter for: ${actor.name}`)
    console.log(actor)
    console.log(`Bruises before heal: ${actor.system.blessure}`)
    // actor.unsetFlag(moduleId, healCounterFlag)
    // return
    //let player = game.actors.get(token.document.actorId)
    //let actor = player.prototypeToken.actorLink ? player : token
    let currentHealCounter = (await actor.getFlag(moduleId, healCounterFlag))
    console.log(`Initial Heal Counter ${currentHealCounter}`)
    let regenRanks = await actor.getFlag(moduleId, regenRanksFlag)
    let formulaSelector = "Remainder"
    
    if(currentHealCounter == undefined || currentHealCounter == null)
    {
        await actor.setFlag(moduleId, healCounterFlag, 0)
        currentHeealCounter = 0
    }
    if(regenRanks == undefined || regenRanks == null)
    {
        regenRanks = calculateHealFrequency(actor)
        await actor.setFlag(moduleId, regenRanksFlag, regenRanks)
    }

    // update heal counter to add heals/round value
    let newHealCounter = direction > 0 ? 1/(10/regenRanks) + currentHealCounter : currentHealCounter - (1/(10/regenRanks))

    let actorHeal = shouldActorHeal(regenRanks, newHealCounter, direction, formulaSelector)
    // If the actor has 0 ranks in regeneration, they cannot heal during combat so end healing
    if(regenRanks == 0)
    {
        console.log("No ranks in Regen, not doing anything")
        return
    }
    if(formulaSelector == "Remainder")
    {
        newHealCounter = await handleRemainderBasedHealing(actor, actorHeal, newHealCounter, 1/(10/regenRanks))
        console.log(`Final Heal Counter: ${newHealCounter}`)
        console.log(`after handle remainder healing bruise count: ${actor.system.blessure}`)
    }
    else if(formulaSelector == "Points")
    {
        // handlePointsBasedHealing()
    }

    await actor.setFlag(moduleId, healCounterFlag, newHealCounter)
    console.log(`Final bruise count: ${actor.system.blessure}`)
    
}

// This hook sets up settings for the module
Hooks.on("init", async () => {
    game.settings.register(moduleId, regenRanksFlag, {
        name: "Ranks in Regeneration",
        hint: "Total ranks spent/acquired on regeneration effects in powers/equipment. -1 to Auto-calculate",
        scope: "client",
        config: "true",
        type: Number,
        default: -1
    })
})

// This hook sets up all the needed flags at the beginning of combat
Hooks.on("preCreateCombatant", async (combatant, tokenData, tempData, combatantId) => {
    let actor = combatant.actor
    await actor.setFlag(moduleId, healCounterFlag, 0)
    await actor.setFlag(moduleId, regenRanksFlag, calculateHealFrequency(actor))
})

// This hook removes all the flags from actors at the end of combat, so they don't accidentally carry over
Hooks.on("deleteCombat", async (combat, render, id) => {
    for(let combatants of combat.turns)
    {
        combatants.actor.unsetFlag(moduleId, healCounterFlag)
        combatants.actor.unsetFlag(moduleId, regenRanksFlag)
        combatants.actor.unsetFlag(moduleId, remainderFlag)
    }
})

// This hook contains the CURRENT turn's character, which is why we use updateCombat here
Hooks.on("updateCombat", async (combat, changed, options, userID) => {
    if(options.direction == 1)
    {
        console.log("New Turn")
        let currentPlayerToken = canvas.tokens.get(combat.current.tokenId)
        // accessing actor via token document will give you the one linked to that token, weather it is
        //   the synthetic actor, or a real linked actor (sytnetic actors can't be searched for by the game object)
        let currentPlayerActor = currentPlayerToken.document.actor
        await updateHealCounter(currentPlayerActor, options.direction, currentPlayerToken)
        console.log(`end of hook bruise count: ${currentPlayerActor.system.blessure}`)
    }
})

// This hook, and the combatTurn hook both contain the previous turn's character, which is why I use it when
//    undoing a heal, because you undo the previously used character's healing
//    NOTE: when I say "previous" I don't mean previous in turn order, I mean previous like who was being accessed
//    before reversing the turn counter. In terms of turn order, it's the next
//    ex. if turn order is A, B, C, D and you are on D, then hit the back button to go back to C's turn,
//    "previous" refers to D
Hooks.on("preUpdateCombat", async (combat, changed, options, userID) => {
    if(options.direction == -1)
    {
        console.log("Go Back a turn")
        let currentPlayerToken = canvas.tokens.get(combat.current.tokenId)
        // accessing actor via token document will give you the one linked to that token, weather it is
        //   the synthetic actor, or a real linked actor (sytnetic actors can't be searched for by the game object)
        let currentPlayerActor = currentPlayerToken.document.actor
        await updateHealCounter(currentPlayerActor, options.direction, currentPlayerToken)
    }
})

