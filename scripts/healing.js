const healCounterFlag = "healCounter"
const healFrequencyFlag = "healFrequency"


Hooks.on("init", () => {
    console.log("Hello World")
})

Hook.on("preUpdateCombat", (combat, changed, options, userID) => {
    let currentPlayerToken = canvas.tokens.get(combat.current.tokenId)
    let currentPlayerActor = game.actors.get(currentPlayerToken.document.actorId)
    console.log(currentPlayerActor.name)
})
