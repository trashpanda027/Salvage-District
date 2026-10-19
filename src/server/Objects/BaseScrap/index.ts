/**
 * A single piece of scrap that can be picked up, dropped, and sold.
 *
 * Owns the scrap's lifecycle state and mirrors it onto the backing Instance's
 * attributes so other scripts (and the client) can observe it.
 *
 * Lifecycle:
 *   Idle <-> PickedUp -> Sold
 *   (any state) -> Destroyed
 */

export interface BaseScrapDefinition {
    readonly Name: string
    readonly BasePrice: number
    readonly MinWeight: number
    readonly MaxWeight: number
}

export enum ScrapState {
    Idle = "Idle",
    PickedUp = "PickedUp",
    Sold = "Sold",
    Destroyed = "Destroyed",
}

const Attributes = {
    IsPickedUp: "IsPickedUp",
    IsSold: "IsSold",
    Zone: "Zone",
} as const

function IsNonNegativeFinite(value: number): boolean {
    // NaN fails both comparisons, so this also rejects NaN
    return value >= 0 && value < math.huge
}

function ValidateDefinition(definition: BaseScrapDefinition): void {
    assert(IsNonNegativeFinite(definition.BasePrice), `BasePrice must be a non-negative number (got ${definition.BasePrice})`)
    assert(IsNonNegativeFinite(definition.MinWeight), `MinWeight must be a non-negative number (got ${definition.MinWeight})`)
    assert(IsNonNegativeFinite(definition.MaxWeight), `MaxWeight must be a non-negative number (got ${definition.MaxWeight})`)
    assert(
        definition.MinWeight <= definition.MaxWeight,
        `MinWeight (${definition.MinWeight}) cannot exceed MaxWeight (${definition.MaxWeight})`,
    )
}

export class BaseScrap {
    // Definition data (immutable after construction)
    public readonly Name: string
    public readonly BasePrice: number
    public readonly MinWeight: number
    public readonly MaxWeight: number

    // Rolled once at construction
    public readonly Weight: number

    // Mutable state is private so it can only change through validated transitions
    private State = ScrapState.Idle

    // TODO: Replace `unknown` with the real Zone type once it exists.
    private Zone: unknown = undefined

    /**
     * @param definition Static data describing this kind of scrap.
     * @param instance   The world object this scrap represents.
     * @param random     Injectable RNG so weight rolls are reproducible in tests.
     */
    constructor(
        definition: BaseScrapDefinition,
        private readonly instance: Instance,
        random: Random = new Random(),
    ) {
        ValidateDefinition(definition)

        this.Name = definition.Name
        this.BasePrice = definition.BasePrice
        this.MinWeight = definition.MinWeight
        this.MaxWeight = definition.MaxWeight

        this.Weight = random.NextNumber(this.MinWeight, this.MaxWeight)

        this.SyncAttributes()
    }

    // Queries

    public GetState(): ScrapState {
        return this.State
    }

    public IsPickedUp(): boolean {
        return this.State === ScrapState.PickedUp
    }

    public IsSold(): boolean {
        return this.State === ScrapState.Sold
    }

    public IsDestroyed(): boolean {
        return this.State === ScrapState.Destroyed
    }

    public GetZone(): unknown {
        return this.Zone
    }

    public GetValue(): number {
        return this.BasePrice * this.Weight
    }

    // Commands

    public SetZone(zone: unknown): void {
        this.AssertNotDestroyed()

        this.Zone = zone
        this.SyncAttributes()
    }

    /** @returns true if the scrap was picked up, false if it wasn't in a pickable state. */
    public PickUp(): boolean {
        return this.Transition(ScrapState.Idle, ScrapState.PickedUp)
    }

    /** @returns true if the scrap was dropped, false if it wasn't being held. */
    public Drop(): boolean {
        return this.Transition(ScrapState.PickedUp, ScrapState.Idle)
    }

    /** @returns the sale value, or undefined if the scrap can't currently be sold. */
    public Sell(): number | undefined {
        return this.Transition(ScrapState.PickedUp, ScrapState.Sold) ? this.GetValue() : undefined
    }

    /** Safe to call more than once. */
    public Destroy(): void {
        if (this.State === ScrapState.Destroyed) return

        this.State = ScrapState.Destroyed
        this.Zone = undefined
        this.instance.Destroy()
    }

    // Internals

    private Transition(from: ScrapState, to: ScrapState): boolean {
        if (this.State !== from) return false

        this.State = to
        this.SyncAttributes()
        return true
    }

    /** Single place where state is mirrored to the Instance, so the two can't drift apart. */
    private SyncAttributes(): void {
        this.instance.SetAttribute(Attributes.IsPickedUp, this.State === ScrapState.PickedUp)
        this.instance.SetAttribute(Attributes.IsSold, this.State === ScrapState.Sold)
        this.instance.SetAttribute(Attributes.Zone, typeIs(this.Zone, "Instance") ? this.Zone.Name : undefined)
    }

    private AssertNotDestroyed(): void {
        assert(this.State !== ScrapState.Destroyed, `Cannot use scrap "${this.Name}" after it was destroyed`)
    }
}