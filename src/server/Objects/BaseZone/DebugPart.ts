/**
 * A visual debugging aid: an invisible, anchored, non-collidable Part with a
 * highlighted box drawn around it, used to visualize regions such as a BaseZone's bounds.
 *
 * The visuals are adornments (SelectionBox outline + BoxHandleAdornment fill) rather
 * than a Highlight, so they render regardless of the Part's own transparency.
 * The Part is excluded from raycasts, spatial queries, and touch events so it can
 * never change gameplay behavior while debugging.
 */

const FILL_TRANSPARENCY = 1
const OUTLINE_THICKNESS = 0.1

export class DebugPart {
    private Part: Part
    private Outline: SelectionBox
    private Fill: BoxHandleAdornment
    private Destroyed = false

    /**
     * @param size     Size of the part in studs. Every axis must be greater than 0.
     * @param position World position of the part's center.
     * @param color    Color used for both the fill and the outline.
     * @param parent   Where to parent the part. Must be a descendant of Workspace to render.
     */
    constructor(
        size: Vector3,
        position: Vector3,
        color: Color3,
        parent: Instance = game.Workspace,
    ) {
        assert(size.X > 0 && size.Y > 0 && size.Z > 0, `DebugPart size must be positive on every axis (got ${size})`)

        const part = new Instance("Part")
        part.Name = "DebugPart"
        part.Size = size
        part.Position = position
        part.Transparency = 1
        part.Anchored = true
        part.CanCollide = false
        part.CanQuery = false
        part.CanTouch = false
        part.CastShadow = false

        const outline = new Instance("SelectionBox")
        outline.Name = "DebugOutline"
        outline.Adornee = part
        outline.Color3 = color
        outline.LineThickness = OUTLINE_THICKNESS
        outline.SurfaceTransparency = 1 // fill is handled by the adornment below
        outline.Parent = part

        const fill = new Instance("BoxHandleAdornment")
        fill.Name = "DebugFill"
        fill.Adornee = part
        fill.Size = size
        fill.Color3 = color
        fill.Transparency = FILL_TRANSPARENCY
        fill.AlwaysOnTop = true
        fill.ZIndex = 1
        fill.Parent = part

        // Parent last so the part appears fully configured, not mid-setup
        part.Parent = parent

        this.Part = part
        this.Outline = outline
        this.Fill = fill
    }

    /** Safe to call more than once. */
    public Destroy(): void {
        if (this.Destroyed) return
        this.Destroyed = true

        this.Fill.Destroy()
        this.Outline.Destroy()
        this.Part.Destroy()
    }

    public IsDestroyed(): boolean {
        return this.Destroyed
    }
}