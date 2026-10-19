import { DebugPart } from "./DebugPart"

const DEFAULT_DEBUG_COLOR = Color3.fromRGB(0, 200, 0)

function IsFiniteVector3(vector: Vector3): boolean {
    // NaN fails every comparison, so this also rejects NaN
    return math.abs(vector.X) < math.huge
        && math.abs(vector.Y) < math.huge
        && math.abs(vector.Z) < math.huge
}

/**
 * An axis-aligned, box-shaped region of the world, defined by its center and size.
 *
 * Rotated zones are not supported: bounds are computed by offsetting the center
 * by half the size on each axis.
 *
 * Position and Size are immutable. To move or resize a zone, create a new one.
 */
export class BaseZone {
    public readonly Name: string
    public readonly Position: Vector3
    public readonly Size: Vector3

    private Debug: DebugPart | undefined
    private Destroyed = false

    /**
     * @param name     Identifier for this zone, useful in logs and debugging.
     * @param position World position of the zone's center.
     * @param size     Size of the zone in studs. Every axis must be greater than 0.
     */
    constructor(name: string, position: Vector3, size: Vector3) {
        assert(IsFiniteVector3(position), `Zone "${name}" position must be finite (got ${position})`)
        assert(
            size.X > 0 && size.Y > 0 && size.Z > 0 && IsFiniteVector3(size),
            `Zone "${name}" size must be positive and finite on every axis (got ${size})`,
        )

        this.Name = name
        this.Position = position
        this.Size = size
    }

    // Queries

    public GetMinimumBounds(): Vector3 {
        return this.Position.sub(this.Size.div(2))
    }

    public GetMaximumBounds(): Vector3 {
        return this.Position.add(this.Size.div(2))
    }

    /** Edges are inclusive: a point exactly on the boundary counts as inside. */
    public ContainsPosition(position: Vector3): boolean {
        const minimum = this.GetMinimumBounds()
        const maximum = this.GetMaximumBounds()

        return (
            position.X >= minimum.X && position.X <= maximum.X &&
            position.Y >= minimum.Y && position.Y <= maximum.Y &&
            position.Z >= minimum.Z && position.Z <= maximum.Z
        )
    }

    public IsDestroyed(): boolean {
        return this.Destroyed
    }

    // Commands

    /**
     * Shows a visual outline of this zone. Does nothing if one is already shown.
     * @param color  Highlight color. Defaults to green.
     * @param parent Where to parent the debug part. Defaults to Workspace.
     */
    public ShowDebug(color: Color3 = DEFAULT_DEBUG_COLOR, parent?: Instance): void {
        this.AssertNotDestroyed()

        if (this.Debug !== undefined && !this.Debug.IsDestroyed()) return

        this.Debug = new DebugPart(this.Size, this.Position, color, parent)
    }

    /** Safe to call even if no debug visual is shown. */
    public HideDebug(): void {
        this.Debug?.Destroy()
        this.Debug = undefined
    }

    /** Releases anything this zone created in the world. Safe to call more than once. */
    public Destroy(): void {
        if (this.Destroyed) return
        this.Destroyed = true

        this.HideDebug()
    }

    // Internals

    private AssertNotDestroyed(): void {
        assert(!this.Destroyed, `Cannot use zone "${this.Name}" after it was destroyed`)
    }
}