export const samplePremiumReportData = {
  "fbiReport": {
    "reportTitle": "A short read of how you use chat",
    "subjectCodename": {
      "name": "Margin notes",
      "justification": "Most threads start as a practical question and end with you rewriting the answer in your own words.",
      "operationalSignificance": "Useful when you want a second pass on something you already almost understand."
    },
    "subjectProfileSummary": "You use chat the way some people use a notebook left open on the desk. A work email, a plant that might be dying, a function that returns the wrong date. The subjects wander. The habit is steady: ask, push back, then write the version you would actually send.",
    "psychologicalProfile": "Patient with a problem once it is specific. Impatient with a vague answer. You often paste the error, then the sentence you wish the error had been.",
    "dominantInterests": [
      "Rewriting emails so they sound like you",
      "Small bugs with long explanations",
      "Cooking when the recipe assumes a different kitchen",
      "Train times and other logistics",
      "What to say at a thing you don't want to attend"
    ],
    "communicationModalities": [
      "A question, then the context you forgot the first time",
      "Quoted error text",
      "A draft, followed by 'shorter'"
    ],
    "emotionalToneAndEngagement": "Even, with a dry aside when something is taking too long. You get warmer when the topic is a person, not a system.",
    "informationSharingTendencies": "You name cities, jobs, and the occasional first name. You rarely paste account numbers. The risk is ordinary context, not a dossier.",
    "piiExamples": [
      {
        "pii": "a first name and a city",
        "context": "Asking how to phrase a note to a friend who just moved",
        "category": "PersonalName",
        "riskLevel": "low",
        "conversationContext": "The name is the point of the message, not an accident"
      }
    ],
    "overallInteractionStyle": "Collaborative, slightly stubborn. You keep the parts of an answer that fit and quietly drop the rest.",
    "behavioralPatterns": [
      "Starts with the constraint, not the theory",
      "Asks for a second version after reading the first out loud",
      "Comes back the next day with what actually happened"
    ],
    "potentialVulnerabilities": [
      "A polished answer can sound more certain than you are",
      "You sometimes leave a draft in the chat and send a different one"
    ],
    "operationalAssessment": "Nothing here looks like a security operation. It looks like someone who thinks better with a little resistance.",
    "disclaimer": "This is a sample card, written to show the shape of a report. It is not a psychological assessment."
  },
  "piiSafetyCompass": {
    "reportTitle": "What you actually typed",
    "awarenessScore": "Low Risk",
    "summary": "The personal details in this sample are the kind you would put in a text to a friend: a name, a neighborhood, a plan for Thursday. No account numbers, no passwords.",
    "detailedBreakdown": [
      {
        "category": "Names and places",
        "advice": "Fine for a note to someone who already knows them. Skip them if you are pasting a chat into a shared doc.",
        "riskLevel": "low",
        "examples": ["A friend's first name", "The station you leave from"]
      },
      {
        "category": "Work",
        "advice": "You describe the situation more than the employer. That is usually enough.",
        "riskLevel": "low",
        "examples": ["A meeting that ran long", "A sentence you didn't want to send"]
      }
    ],
    "overallSecurityPosture": "Ordinary. You are not hiding, and you are not handing over the keys.",
    "recommendedActions": [
      "Glance at a thread before you upload it if it mentions someone else",
      "Delete the upload from the studio when you are done with the cards"
    ],
    "disclaimer": "This looks at categories, not a live scan of your files. It is not a security audit."
  },
  "realityTVPersona": {
    "reportTitle": "If this were a show",
    "personaArchetype": "The one who reads the instructions",
    "description": "You would be the contestant who asks what the timer is actually counting, then makes something edible with the sad bunch of herbs. Not the villain. Not the narrator. The person the edit keeps cutting back to because the plan changed and you noticed.",
    "popCultureComparisons": [
      "The friend in a cooking show who tastes the sauce and adds salt without announcing it"
    ],
    "characterTraits": [
      "Specific",
      "A little dry",
      "Hard to rush",
      "Loyal to the original question"
    ],
    "likelyStoryArcs": [
      "Fixes the thing everyone else talked around",
      "Leaves before the afterparty, texting that the train was on time"
    ],
    "viewerAppeal": "People who like competence when it isn't loud.",
    "conflictStyle": "You restate the question. That is usually the argument.",
    "disclaimer": "A sample, for the bit. Not a casting decision."
  },
  "unfilteredMirror": {
    "reportTitle": "The unfiltered mirror",
    "observation": "You ask for help, then spend the rest of the thread making the answer smaller until it could have come from you.",
    "deeperInsight": "The chat is less a search for an expert than a place to hear the problem said back in a different order.",
    "psychologicalImplications": "You trust a sentence more after you have edited it. That is a preference, not a flaw.",
    "disclaimer": "A sample observation. It is a guess about a made-up archive, meant for the tone of the card."
  },
  "digitalDoppelganger": {
    "reportTitle": "A fictional account in your voice",
    "handle": "@leftthetabopen",
    "bio": "Notes from the train. Soups that almost worked. Bugs that were the timezone.",
    "topHashtags": [
      "#later",
      "#theerror",
      "#thursday"
    ],
    "personalityTraits": [
      "Observant",
      "Slightly delayed",
      "Fond of a concrete example"
    ],
    "posts": [
      {
        "id": "1",
        "content": "The basil died. I had a theory. The theory was also wrong. It wanted less attention, which I respect.",
        "timestamp": "2h",
        "likes": 42,
        "retweets": 3,
        "replies": 6
      },
      {
        "id": "2",
        "content": "Rewrote the same email four times. Sent the second version. The fourth one was for me.",
        "timestamp": "6h",
        "likes": 61,
        "retweets": 4,
        "replies": 2
      },
      {
        "id": "3",
        "content": "The date bug was UTC. Of course it was UTC. I will forget this again in March.",
        "timestamp": "1d",
        "likes": 88,
        "retweets": 11,
        "replies": 9
      }
    ],
    "disclaimer": "A made-up profile for the sample. Not a real account."
  },
  "linguisticFingerprint": {
    "reportTitle": "How the sentences go",
    "overallStyleDescription": "Short when you are asking. Longer when you are explaining what you already tried. You quote the error instead of describing it.",
    "vocabularyProfile": {
      "qualitativeAssessment": "Plain words, with the occasional precise noun. You reach for 'actually' when a previous sentence was slightly off.",
      "notableWords": [
        "actually",
        "the error says",
        "shorter",
        "wait",
        "for Thursday",
        "not that"
      ],
      "sophisticationLevel": "Clear",
      "domainSpecificTerms": [
        "the timezone",
        "the draft",
        "the second version"
      ],
      "linguisticMarkers": [
        "A correction in the next message",
        "Examples before definitions",
        "Few adjectives"
      ]
    },
    "sentenceStructure": "Questions first. Then a paragraph once you know which part was wrong.",
    "expressiveness": "Wit shows up as understatement. You rarely announce that something is funny.",
    "potentialInterestsIndicatedByLanguage": [
      "Writing that has to be sent to a person",
      "Fixing a small thing properly",
      "Plans with a time attached"
    ],
    "communicationEffectiveness": "Easy to follow. You leave enough context that a stranger could pick up the thread.",
    "rhetoricalDevices": [
      "Quoting the awkward sentence",
      "Trying the opposite phrasing",
      "Ending when the point is made"
    ],
    "cognitiveComplexity": "You hold one constraint at a time, then add the next. The thinking is layered because you come back, not because the first message is dense.",
    "disclaimer": "A sample of the linguistic card. Not a test score."
  },
  "topInterestingConversations": [
    {
      "conversationId": "sample-email",
      "title": "The email I didn't send",
      "justification": "Four drafts of a note about a meeting that ran long. You kept the apology and cut the explanation.",
      "significance": "A small edit with a real recipient",
      "insights": ["You revise out loud", "The second version was the one you meant"]
    },
    {
      "conversationId": "sample-basil",
      "title": "Why the basil died",
      "justification": "You described the windowsill, the watering, and then admitted you had been checking it every day.",
      "significance": "Ordinary care, described precisely",
      "insights": ["You notice conditions", "You update the theory"]
    },
    {
      "conversationId": "sample-date",
      "title": "The date helper",
      "justification": "A bug that only showed up for someone in another timezone. You pasted the function, then the failing test.",
      "significance": "The useful kind of stubborn",
      "insights": ["Error text first", "You wanted the cause, not a rewrite"]
    },
    {
      "conversationId": "sample-train",
      "title": "Getting to your sister's",
      "justification": "Three route options, a preference for the one with a seat, and a reminder to text when you change trains.",
      "significance": "Logistics with a person at the end",
      "insights": ["Time matters more than the clever route"]
    },
    {
      "conversationId": "sample-card",
      "title": "A birthday card that isn't cute",
      "justification": "You rejected two jokes and kept a sentence about a walk you took in October.",
      "significance": "Specific beats clever",
      "insights": ["You know the voice you want", "You use chat to get there, then leave"]
    }
  ]
};
