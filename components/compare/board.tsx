"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { inkFor, labelFor, type Settings, type SheetImage } from "@/lib/sheet"

const fonts = {
  sans: "var(--font-sans)",
  serif: "var(--font-serif)",
  mono: "var(--font-mono)",
}

const FILM_BG = "#181614"
const FILM_EDGE = "#e2a03f"

type BoardProps = {
  images: SheetImage[]
  settings: Settings
  onLabel: (id: string, label: string | undefined) => void
  onRemove: (id: string) => void
}

export const Board = React.forwardRef<HTMLDivElement, BoardProps>(function Board(
  { images, settings: s, onLabel, onRemove },
  ref,
) {
  const film = s.layout === "film"
  const bg = film ? FILM_BG : s.background
  const ink = inkFor(bg)
  const first = images[0]
  const cellAspect =
    s.aspect === "auto" ? (first ? `${first.width}/${first.height}` : "1/1") : s.aspect
  const columns = s.layout === "row" ? images.length : Math.min(s.columns, images.length)

  const listStyle: React.CSSProperties =
    s.layout === "masonry"
      ? { columnCount: columns, columnGap: s.gap }
      : {
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: film ? 0 : s.gap,
          rowGap: s.gap,
          alignItems: "start",
        }

  return (
    <div
      ref={ref}
      className="w-full"
      style={{
        background: bg,
        color: ink,
        padding: s.padding,
        fontFamily: fonts[s.labelFont],
      }}
    >
      {s.title && (
        <h2
          className="leading-tight font-semibold tracking-tight text-balance"
          style={{
            fontSize: Math.round(s.labelSize * 1.9),
            textAlign: s.labelAlign,
            marginBottom: Math.max(s.gap, s.labelSize),
          }}
        >
          {s.title}
        </h2>
      )}
      <div style={listStyle}>
        {images.map((img, i) => (
          <Tile
            key={img.id}
            img={img}
            index={i}
            settings={s}
            aspect={s.layout === "masonry" ? `${img.width}/${img.height}` : cellAspect}
            ink={ink}
            onLabel={onLabel}
            onRemove={onRemove}
          />
        ))}
      </div>
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
}

function Tile({ img, index, settings: s, aspect, ink, onLabel, onRemove }: TileProps) {
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

  const caption = (pos !== "none" || num !== undefined) && (
    <Caption
      text={pos === "none" ? "" : label}
      num={film ? undefined : num}
      pos={pos === "none" ? "tag" : pos}
      align={s.labelAlign}
      size={s.labelSize}
      editable={pos !== "none"}
      onCommit={(v) => onLabel(img.id, v)}
    />
  )

  const picture = (
    <div
      className="relative overflow-hidden"
      style={{ aspectRatio: aspect, borderRadius: film ? 0 : framed ? 2 : s.radius }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob URLs */}
      <img
        src={img.url}
        alt={label || img.name}
        draggable={false}
        className="size-full select-none"
        style={{ objectFit: s.layout === "masonry" ? "cover" : s.fit }}
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
        className="cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-marker active:cursor-grabbing"
        style={
          framed
            ? {
                background: "#fdfdfc",
                color: "#1d1f23",
                padding: frame,
                paddingBottom: pos === "below" ? frame : frame * 2.5,
                boxShadow: "0 1px 2px rgb(0 0 0 / 0.12), 0 6px 16px -6px rgb(0 0 0 / 0.18)",
                borderRadius: Math.min(s.radius, 6),
              }
            : film
              ? { color: "#efe9df", padding: "0 3px" }
              : { color: ink }
        }
      >
        {film && <FilmEdge num={num!} top />}
        {pos === "above" && caption}
        {picture}
        {pos === "below" && caption}
        {film && <FilmEdge />}
      </figure>
      <button
        type="button"
        data-no-export
        onClick={() => onRemove(img.id)}
        aria-label={`Remove ${img.name}`}
        className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-marker"
        style={{ top: film ? 30 : undefined }}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
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
  num?: number
  pos: Exclude<Settings["labelPos"], "none">
  align: Settings["labelAlign"]
  size: number
  editable: boolean
  onCommit: (v: string | undefined) => void
}

function Caption({ text, num, pos, align, size, editable, onCommit }: CaptionProps) {
  const [editing, setEditing] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commit = (v: string) => {
    setEditing(false)
    const trimmed = v.trim()
    if (trimmed !== text) onCommit(trimmed === "" ? undefined : trimmed)
  }

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
  ) : (
    <span
      onClick={editable ? () => setEditing(true) : undefined}
      className={cn(editable && "cursor-text", "break-words")}
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
          style={{ fontSize: size * 0.85 }}
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
          textAlign: align,
          padding: `${size * 1.6}px ${size * 0.75}px ${size * 0.6}px`,
          ...(top && { padding: `${size * 0.6}px ${size * 0.75}px ${size * 1.6}px` }),
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
        textAlign: align,
        padding: pos === "below" ? `${size * 0.5}px 1px 0` : `0 1px ${size * 0.5}px`,
      }}
    >
      {body}
    </figcaption>
  )
}
