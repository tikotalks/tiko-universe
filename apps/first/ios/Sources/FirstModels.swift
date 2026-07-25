import Foundation

// MARK: - Steps

/// One thing that happens in a routine. `speakText` is what the voice says and
/// defaults to the title; the image comes from the Tiko media library with the
/// emoji as the always-available fallback.
struct RoutineStep: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var speakText: String
    var emoji: String
    var imageURL: URL?
    var sortOrder: Int

    init(
        id: String,
        title: String,
        speakText: String? = nil,
        emoji: String,
        imageURL: URL? = nil,
        sortOrder: Int
    ) {
        self.id = id
        self.title = title
        self.speakText = (speakText?.isEmpty == false ? speakText! : title)
        self.emoji = emoji
        self.imageURL = imageURL
        self.sortOrder = sortOrder
    }

    /// What the voice should actually say — never empty.
    var spoken: String {
        let trimmed = speakText.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? title : trimmed
    }
}

// MARK: - Routines

/// An ordered list of steps a child works through. `dailyReset` makes the
/// routine fresh again on the next calendar day; `allowSkip` is the parent's
/// escape hatch for flexible days; `isPinned` opens this routine directly.
struct Routine: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var emoji: String
    var imageURL: URL?
    var steps: [RoutineStep]
    var dailyReset: Bool
    var allowSkip: Bool
    var isPinned: Bool
    let isCustom: Bool
    var isHidden: Bool
    var sortOrder: Int

    var orderedSteps: [RoutineStep] {
        steps.sorted { ($0.sortOrder, $0.id) < ($1.sortOrder, $1.id) }
    }
}

/// A Parent Mode edit of a bundled routine, keyed by routine ID and language.
/// `nil` fields mean "still the default", so updated defaults keep flowing
/// through — the family override pattern.
struct RoutineOverride: Codable, Hashable {
    let routineID: String
    let languageCode: String
    var title: String?
    var emoji: String?
    var steps: [RoutineStep]?
    var dailyReset: Bool?
    var allowSkip: Bool?
    var isPinned: Bool?
    var isHidden: Bool = false
    var sortOrder: Int?

    var isEmpty: Bool {
        title == nil && emoji == nil && steps == nil && dailyReset == nil
            && allowSkip == nil && isPinned == nil && !isHidden && sortOrder == nil
    }
}

// MARK: - Progress

/// How far a child has got. `resolvedStepIDs` is ordered by when each step was
/// crossed off, so undo-last is simply "drop the last one"; the skipped subset
/// renders differently but still counts as resolved.
struct RoutineProgress: Codable, Hashable {
    let routineID: String
    var resolvedStepIDs: [String]
    var skippedStepIDs: Set<String>
    var lastUpdated: Date

    init(
        routineID: String,
        resolvedStepIDs: [String] = [],
        skippedStepIDs: Set<String> = [],
        lastUpdated: Date = Date()
    ) {
        self.routineID = routineID
        self.resolvedStepIDs = resolvedStepIDs
        self.skippedStepIDs = skippedStepIDs
        self.lastUpdated = lastUpdated
    }

    var isEmpty: Bool { resolvedStepIDs.isEmpty }

    func isResolved(_ stepID: String) -> Bool { resolvedStepIDs.contains(stepID) }
    func isSkipped(_ stepID: String) -> Bool { skippedStepIDs.contains(stepID) }
}

/// How a step left the "to do" state — a tick and a skip look different to the
/// child, and only a tick is a completion.
enum StepResolution: String, Codable, Hashable {
    case done
    case skipped
}

// MARK: - Routine state machine

enum RoutineState: Equatable {
    case idle
    /// The current step is on screen and being spoken.
    case presenting
    /// Waiting for the child to cross the current step off.
    case waiting
    /// The tick landed: small celebration before the next step slides in.
    case ticking
    /// Every step is resolved — the big celebration.
    case completed
}
