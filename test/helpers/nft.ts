// NFT helper functions

export enum Ability {
  SPEEDO,
  PUNDGY,
  DILIGENT,
  ENDOWED,
  HIBERNATE,
}

export enum Classification {
  COMMON,
  UNCOMMON,
  RARE,
  MYSTIC,
  LEGENDARY,
}

export function rand(min: number, max: number) {
  return Math.ceil(Math.random() * (max - min) + min)
}

export function getClassification(score: number) {
  if (score <= 12) {
    return Classification.COMMON
  } else if (score <= 14) {
    return Classification.UNCOMMON
  } else if (score <= 16) {
    return Classification.RARE
  } else if (score <= 19) {
    return Classification.MYSTIC
  } else if (score <= 24) {
    return Classification.LEGENDARY
  } else {
    throw new Error('Classification: what?')
  }
}

export function getPower(ability: Ability, classification: Classification) {
  switch (ability) {
    case Ability.SPEEDO || Ability.PUNDGY: {
      if (classification == Classification.COMMON) {
        return rand(1, 3)
      } else if (classification == Classification.UNCOMMON) {
        return rand(3, 5)
      } else if (classification == Classification.RARE) {
        return rand(5, 10)
      } else if (classification == Classification.MYSTIC) {
        return rand(10, 15)
      } else if (classification == Classification.LEGENDARY) {
        return rand(15, 30)
      }
      break
    }
    case Ability.DILIGENT: {
      if (classification == Classification.COMMON) {
        return rand(100, 300)
      } else if (classification == Classification.UNCOMMON) {
        return rand(300, 500)
      } else if (classification == Classification.RARE) {
        return rand(500, 1000)
      } else if (classification == Classification.MYSTIC) {
        return rand(1000, 1500)
      } else if (classification == Classification.LEGENDARY) {
        return rand(1500, 3000)
      }
      break
    }
    case Ability.ENDOWED: {
      if (classification == Classification.COMMON) {
        return rand(30000, 100000)
      } else if (classification == Classification.UNCOMMON) {
        return rand(100000, 300000)
      } else if (classification == Classification.RARE) {
        return rand(300000, 1000000)
      } else if (classification == Classification.MYSTIC) {
        return rand(1000000, 3000000)
      } else if (classification == Classification.LEGENDARY) {
        return rand(3000000, 10000000)
      }
      break
    }
    case Ability.HIBERNATE: {
      if (classification == Classification.COMMON) {
        return rand(0, 0)
      } else if (classification == Classification.UNCOMMON) {
        return rand(10, 20)
      } else if (classification == Classification.RARE) {
        return rand(20, 30)
      } else if (classification == Classification.MYSTIC) {
        return rand(30, 50)
      } else if (classification == Classification.LEGENDARY) {
        return rand(50, 100)
      }
      break
    }
    default: {
      throw new Error('Ability: what?')
    }
  }
}

// generates random nft.
// Does not respect some of the rules yet and should be used only for testing purposes
export const generateNft = () => {
  const abilityType = rand(0, 4)
  const attributes = [rand(0, 4), rand(0, 4), rand(0, 4), rand(0, 4), rand(0, 4), rand(0, 4)]
  const score = attributes.reduce((a, b) => a + b, 0)
  const classification = getClassification(score)
  const power = getPower(abilityType, classification)

  return {
    ability: abilityType,
    power: power,
    score: score,
    eyes: attributes[0],
    mouth: attributes[1],
    foot: attributes[2],
    body: attributes[3],
    tail: attributes[4],
    accessories: attributes[5],
    classification: classification,
  }
}
