"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import type { ParsedPrompt } from "@/lib/prompt"
import { inkFor, labelFor, labelParts, lines, type Settings, type SheetImage } from "@/lib/sheet"

const fonts = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
}

const FILM_BG = "#181614"
const flexAlign = { left: "flex-start", center: "center", right: "flex-end" } as const
const MAX_TAGS = 8
const FILM_EDGE = "#e2a03f"

type BoardProps = {
  images: SheetImage[]
  settings: Settings
  onLabel: (id: string, label: string | undefined) => void
  onRemove: (id: string) => void
  onView: (id: string) => void
}

export const Board = React.forwardRef<HTMLDivElement, BoardProps>(function Board(
  { images, settings: s, onLabel, onRemove, onView },
  ref,
) {
  const film = s.layout === "film"
  const bg = film ? FILM_BG : s.background
  const ink = inkFor(bg)
  const first = images[0]
  const cellAspect =
    s.aspect === "auto" ? (first ? `${first.width}/${first.height}` : "1/1") : s.aspect
  const columns = Math.max(1, s.layout === "row" ? images.length : Math.min(s.columns, images.length))

  const colHeads = s.layout === "masonry" ? [] : lines(s.colHeaders)
  const rowHeads = s.layout === "masonry" || s.layout === "row" ? [] : lines(s.rowHeaders)
  const hasCols = colHeads.length > 0
  const hasRows = rowHeads.length > 0
  const headStyle: React.CSSProperties = {
    fontSize: Math.round(s.labelSize * 1.05),
    fontWeight: 600,
    lineHeight: 1.25,
  }

  const listStyle: React.CSSProperties =
    s.layout === "masonry"
      ? { columnCount: columns, columnGap: s.gap }
      : {
          display: "grid",
          gridTemplateColumns: `${hasRows ? "auto " : ""}repeat(${columns}, minmax(0, 1fr))`,
          columnGap: film ? 0 : s.gap,
          rowGap: s.gap,
          alignItems: "start",
        }

  const cells: React.ReactNode[] = []
  if (hasCols) {
    if (hasRows) cells.push(<div key="corner" />)
    for (let c = 0; c < columns; c++)
      cells.push(
        <div key={`ch${c}`} className="self-end text-center text-balance" style={{ ...headStyle, padding: film ? "0 3px" : 0 }}>
          {colHeads[c] ?? ""}
        </div>,
      )
  }
  images.forEach((img, i) => {
    if (hasRows && i % columns === 0)
      cells.push(
        <div
          key={`rh${i}`}
          className="self-center text-right text-balance"
          style={{ ...headStyle, maxWidth: 220, paddingRight: film ? 12 : 0 }}
        >
          {rowHeads[i / columns] ?? ""}
        </div>,
      )
    cells.push(
      <Tile
        key={img.id}
        img={img}
        index={i}
        settings={s}
        aspect={s.layout === "masonry" ? `${img.width}/${img.height}` : cellAspect}
        ink={ink}
        onLabel={onLabel}
        onRemove={onRemove}
        onView={onView}
      />,
    )
  })

  const textBlock = (text: string, style: React.CSSProperties, className?: string) =>
    text && (
      <p className={cn("whitespace-pre-line", className)} style={{ textAlign: s.titleAlign, ...style }}>
        {text}
      </p>
    )

  return (
    <div
      ref={ref}
      style={{
        background: bg,
        color: ink,
        padding: s.padding,
        fontFamily: fonts[s.labelFont],
        width: s.sheetWidth === "fit" ? "100%" : Number(s.sheetWidth),
      }}
    >
      {(s.title || s.subtitle) && (
        <header style={{ marginBottom: Math.max(s.gap, s.labelSize) * 1.25 }}>
          {s.title && (
            <h2
              className="leading-tight font-semibold tracking-tight text-balance"
              style={{ fontSize: s.titleSize, textAlign: s.titleAlign }}
            >
              {s.title}
            </h2>
          )}
          {textBlock(
            s.subtitle,
            { fontSize: Math.max(11, s.titleSize * 0.5), marginTop: s.title ? s.titleSize * 0.3 : 0, opacity: 0.7 },
            "leading-snug text-pretty",
          )}
        </header>
      )}
      <div style={listStyle}>{cells}</div>
      {textBlock(
        s.footer,
        { fontSize: Math.max(10, s.labelSize * 0.85), marginTop: Math.max(s.gap, s.labelSize) * 1.25, opacity: 0.6 },
        "leading-snug",
      )}
    </div>
  )
})

type TileProps = {
  img: SheetImage
  index: number
  settings: Settings
  aspect: string
  ink: string
  onLabel: BoardProps["onLabel"]
  onRemove: BoardProps["onRemove"]
  onView: BoardProps["onView"]
}

function Tile({ img, index, settings: s, aspect, ink, onLabel, onRemove, onView }: TileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: img.id,
  })
  const label = labelFor(img, s.labelFields)
  const num = s.numbers || s.layout === "film" ? index + 1 : undefined
  const pos = s.labelPos
  const overlay = pos === "inside-top" || pos === "inside-bottom" || pos === "tag"
  const framed = s.layout === "framed"
  const film = s.layout === "film"
  const frame = Math.max(8, Math.round(s.gap * 0.75))
  const textColor = s.labelColor || (framed ? "#1d1f23" : film ? "#efe9df" : ink)

  const caption = (pos !== "none" || num !== undefined) && (
    <Caption
      text={pos === "none" ? "" : label}
      parts={pos === "none" || img.label !== undefined ? null : labelParts(img, s.labelFields, s.hideQualityTags)}
      num={film ? undefined : num}
      pos={pos === "none" ? "tag" : pos}
      settings={s}
      editable={pos !== "none"}
      onCommit={(v) => onLabel(img.id, v)}
    />
  )

  const radius = film ? 0 : framed ? Math.min(s.radius, 3) : s.radius
  const picture = (
    <div
      className="relative overflow-hidden"
      style={{
        aspectRatio: aspect,
        borderRadius: radius,
        outline: s.border && !film ? `${s.border}px solid ${s.borderColor}` : undefined,
        outlineOffset: -s.border,
        boxShadow:
          s.shadow && !framed && !film
            ? "0 1px 2px rgb(0 0 0 / 0.14), 0 8px 20px -8px rgb(0 0 0 / 0.3)"
            : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob URLs */}
      <img
        src={img.url}
        alt={label || img.name}
        draggable={false}
        className="size-full select-none"
        style={{ objectFit: s.layout === "masonry" ? "cover" : s.fit, borderRadius: radius }}
      />
      {overlay && caption}
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        breakInside: "avoid",
        marginBottom: s.layout === "masonry" ? s.gap : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={cn("group/tile relative", isDragging && "opacity-80")}
    >
      <figure
        {...attributes}
        {...listeners}
        aria-label={label || img.name}
        onDoubleClick={() => onView(img.id)}
        className="cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-marker active:cursor-grabbing"
        style={
          framed
            ? {
                background: "#fdfdfc",
                color: textColor,
                padding: frame,
                paddingBottom: pos === "below" ? frame : frame * 2.5,
                boxShadow: "0 1px 2px rgb(0 0 0 / 0.12), 0 6px 16px -6px rgb(0 0 0 / 0.18)",
                borderRadius: Math.min(s.radius, 6),
              }
            : film
              ? { color: textColor, padding: "0 3px" }
              : { color: textColor }
        }
      >
        {film && <FilmEdge num={num!} top />}
        {pos === "above" && caption}
        {picture}
        {pos === "below" && caption}
        {film && <FilmEdge />}
      </figure>
      <div
        data-no-export
        className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover/tile:opacity-100 focus-within:opacity-100"
        style={{ top: film ? 30 : framed ? frame + 6 : undefined, right: framed ? frame + 6 : undefined }}
      >
        <TileButton label={`View ${img.name}`} onClick={() => onView(img.id)} icon="icon-[ph--arrows-out-simple]" />
        <TileButton label={`Remove ${img.name}`} onClick={() => onRemove(img.id)} icon="icon-[ph--x]" />
      </div>
    </div>
  )
}

function TileButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label.split(" ")[0]}
      className="grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-marker"
    >
      <Icon className={cn(icon, "size-3.5")} />
    </button>
  )
}

// The sprocket band above and below a frame, with the edge number like on 35mm stock.
function FilmEdge({ num, top }: { num?: number; top?: boolean }) {
  return (
    <div className={cn("relative", top ? "h-[24px]" : "h-[14px]")} aria-hidden>
      <div
        className="absolute inset-x-0 top-[4px] h-[6px]"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 5px, rgb(255 255 255 / 0.82) 5px 13px, transparent 13px 18px)",
          maskImage: "linear-gradient(90deg, transparent, #000 4px, #000 calc(100% - 4px), transparent)",
        }}
      />
      {num !== undefined && (
        <span
          className="absolute bottom-[2px] left-1.5 font-mono text-[10px] leading-none font-semibold tabular-nums"
          style={{ color: FILM_EDGE }}
        >
          {num}
        </span>
      )}
    </div>
  )
}

type CaptionProps = {
  text: string
  parts: ReturnType<typeof labelParts> | null
  num?: number
  pos: Exclude<Settings["labelPos"], "none">
  settings: Settings
  editable: boolean
  onCommit: (v: string | undefined) => void
}

function Caption({ text, parts, num, pos, settings: s, editable, onCommit }: CaptionProps) {
  const [editing, setEditing] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const size = s.labelSize
  const align = s.labelAlign
  const weight = Number(s.labelWeight)

  React.useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = (v: string) => {
    setEditing(false)
    const trimmed = v.trim()
    if (trimmed !== text) onCommit(trimmed === "" ? undefined : trimmed)
  }

  const numBadge = num !== undefined && (
    <span className="font-semibold tabular-nums" style={{ marginRight: "0.5em" }}>
      {num}
    </span>
  )

  const clamp: React.CSSProperties = s.labelLines
    ? { display: "-webkit-box", WebkitLineClamp: s.labelLines, WebkitBoxOrient: "vertical", overflow: "hidden" }
    : {}

  const body = editing ? (
    <input
      ref={inputRef}
      defaultValue={text}
      aria-label="Label"
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") setEditing(false)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="w-full min-w-0 rounded-sm bg-transparent outline-1 outline-current/40 outline-dashed"
      style={{ font: "inherit", textAlign: align, color: "inherit" }}
    />
  ) : parts && (parts.text.length || parts.params.length || parts.prompt) ? (
    <span
      onClick={editable ? () => setEditing(true) : undefined}
      className={cn(editable && "cursor-text", "flex flex-col break-words")}
      style={{ gap: "0.2em", alignItems: flexAlign[align] }}
    >
      {parts.text.map((line, i) => (
        <span key={i} style={clamp}>
          {i === 0 && numBadge}
          {line}
        </span>
      ))}
      {parts.prompt && (
        <PromptBlock
          prompt={parts.prompt}
          badge={parts.text.length ? null : numBadge}
          small={parts.text.length > 0 || parts.params.length > 0}
          lines={s.labelLines || 2}
          justify={flexAlign[align]}
        />
      )}
      {parts.params.length > 0 && (
        <span
          className="flex flex-wrap"
          style={{
            columnGap: "0.85em",
            rowGap: "0.1em",
            justifyContent: flexAlign[align],
            fontSize: parts.text.length ? "0.86em" : undefined,
          }}
        >
          {!parts.text.length && !parts.prompt && numBadge}
          {parts.params.map((p) => (
            <span key={p.key} className="whitespace-nowrap">
              <span style={{ opacity: 0.6 }}>{p.key}</span>{" "}
              <span className="tabular-nums" style={{ fontWeight: Math.max(weight, 500) }}>
                {p.value}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  ) : (
    <span
      onClick={editable ? () => setEditing(true) : undefined}
      className={cn(editable && "cursor-text", "break-words")}
      style={clamp}
    >
      {num !== undefined && (
        <span className="font-semibold tabular-nums" style={{ marginRight: text ? "0.5em" : 0 }}>
          {num}
        </span>
      )}
      {text}
    </span>
  )

  if (pos === "tag") {
    return (
      <div className="pointer-events-none absolute top-0 left-0 max-w-[85%] p-2">
        <div
          className="pointer-events-auto inline-block rounded-[4px] bg-black/65 px-1.5 py-0.5 leading-snug text-white"
          style={{ fontSize: size * 0.85, fontWeight: weight }}
        >
          {body}
        </div>
      </div>
    )
  }

  if (pos === "inside-top" || pos === "inside-bottom") {
    const top = pos === "inside-top"
    return (
      <figcaption
        className={cn("absolute inset-x-0 leading-snug text-white", top ? "top-0" : "bottom-0")}
        style={{
          fontSize: size,
          fontWeight: weight,
          textAlign: align,
          padding: top
            ? `${size * 0.6}px ${size * 0.75}px ${size * 1.6}px`
            : `${size * 1.6}px ${size * 0.75}px ${size * 0.6}px`,
          background: `linear-gradient(${top ? "to bottom" : "to top"}, rgb(0 0 0 / 0.62), rgb(0 0 0 / 0))`,
          textShadow: "0 1px 2px rgb(0 0 0 / 0.4)",
        }}
      >
        {body}
      </figcaption>
    )
  }

  return (
    <figcaption
      className="leading-snug"
      style={{
        fontSize: size,
        fontWeight: weight,
        textAlign: align,
        padding: pos === "below" ? `${size * 0.5}px 1px 0` : `0 1px ${size * 0.5}px`,
      }}
    >
      {body}
    </figcaption>
  )
}

function PromptBlock({
  prompt,
  badge,
  small,
  lines,
  justify,
}: {
  prompt: ParsedPrompt
  badge: React.ReactNode
  small: boolean
  lines: number
  justify: React.CSSProperties["justifyContent"]
}) {
  const shown = prompt.tags.slice(0, MAX_TAGS)
  const more = prompt.tags.length - shown.length
  const chip: React.CSSProperties = {
    fontSize: "0.88em",
    lineHeight: 1.35,
    padding: "0.12em 0.6em",
    borderRadius: 999,
    background: "color-mix(in srgb, currentColor 11%, transparent)",
  }
  if (!prompt.lead && !shown.length) return null
  return (
    <span className="flex flex-col" style={{ gap: "0.35em", fontSize: small ? "0.94em" : undefined, alignItems: justify }}>
      {prompt.lead && (
        <span
          style={{ opacity: 0.85, display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {badge}
          {prompt.lead}
        </span>
      )}
      {shown.length > 0 && (
        <span className="flex flex-wrap items-center" style={{ gap: "0.3em", justifyContent: justify }}>
          {!prompt.lead && badge}
          {shown.map((t) => (
            <span key={t} className="whitespace-nowrap" style={chip}>
              {t}
            </span>
          ))}
          {more > 0 && (
            <span className="whitespace-nowrap tabular-nums" style={{ ...chip, background: "transparent", opacity: 0.6 }}>
              +{more}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
