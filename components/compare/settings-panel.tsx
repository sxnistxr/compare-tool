"use client"

import * as React from "react"
import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fieldNames, type LabelField, type Layout, type Settings } from "@/lib/sheet"

type Props = {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  editedLabels: number
  onResetLabels: () => void
}

const layouts: { value: Layout; name: string }[] = [
  { value: "grid", name: "Grid" },
  { value: "masonry", name: "Masonry" },
  { value: "framed", name: "Framed" },
  { value: "film", name: "Film" },
  { value: "row", name: "Row" },
]

const positions = {
  below: "Below image",
  above: "Above image",
  "inside-bottom": "On image, bottom",
  "inside-top": "On image, top",
  tag: "Corner tag",
  none: "Hidden",
}

const aspects = {
  auto: "Same as first image",
  "1/1": "Square",
  "3/4": "Portrait 3:4",
  "4/3": "Landscape 4:3",
}

const swatches = ["#ffffff", "#e9e9e7", "#2b2b2b", "#000000"]

export function SettingsPanel({ settings: s, onChange, editedLabels, onResetLabels }: Props) {
  const showColumns = s.layout !== "row"
  const showShape = s.layout !== "masonry"

  return (
    // suppressHydrationWarning: password managers (e.g. Proton Pass) tag form containers before hydration.
    <div suppressHydrationWarning className="flex flex-col gap-7 px-5 pt-5 pb-10">
      <Group title="Layout">
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Layout">
          {layouts.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={s.layout === l.value}
              onClick={() => onChange({ layout: l.value })}
              className={cn(
                "group flex flex-col items-center gap-1.5 rounded-md pt-2 pb-1.5 text-[11px] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                s.layout === l.value && "bg-muted text-foreground",
              )}
            >
              <LayoutGlyph layout={l.value} active={s.layout === l.value} />
              {l.name}
            </button>
          ))}
        </div>
        {showColumns && (
          <Range label="Columns" value={s.columns} min={1} max={12} onChange={(columns) => onChange({ columns })} />
        )}
        <Range label="Spacing" value={s.gap} min={0} max={64} unit="px" onChange={(gap) => onChange({ gap })} />
        {s.layout !== "film" && (
          <Range label="Corners" value={s.radius} min={0} max={24} unit="px" onChange={(radius) => onChange({ radius })} />
        )}
        {showShape && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Shape">
              <Select
                items={aspects}
                value={s.aspect}
                onValueChange={(v) => v && onChange({ aspect: v as Settings["aspect"] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(aspects).map(([v, name]) => (
                    <SelectItem key={v} value={v}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[s.fit]}
              onValueChange={(v) => v[0] && onChange({ fit: v[0] as Settings["fit"] })}
              aria-label="Fit"
              className="h-8"
            >
              <ToggleGroupItem value="cover" className="h-8 px-2.5">
                Crop
              </ToggleGroupItem>
              <ToggleGroupItem value="contain" className="h-8 px-2.5">
                Fit
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </Group>

      <Group title="Labels">
        <Field label="Position">
          <Select
            items={positions}
            value={s.labelPos}
            onValueChange={(v) => v && onChange({ labelPos: v as Settings["labelPos"] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(positions).map(([v, name]) => (
                <SelectItem key={v} value={v}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {s.labelPos !== "none" && (
          <>
            <Field label="Show">
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(fieldNames) as LabelField[]).map((f) => {
                  const on = s.labelFields.includes(f)
                  return (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        onChange({
                          labelFields: on
                            ? s.labelFields.filter((x) => x !== f)
                            : (Object.keys(fieldNames) as LabelField[]).filter(
                                (x) => x === f || s.labelFields.includes(x),
                              ),
                        })
                      }
                      className={cn(
                        "h-7 rounded-full border px-2.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on
                          ? "border-foreground bg-foreground text-background"
                          : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {fieldNames[f]}
                    </button>
                  )
                })}
              </div>
              {editedLabels > 0 && (
                <p className="text-xs text-muted-foreground">
                  {editedLabels} edited by hand.{" "}
                  <button
                    type="button"
                    onClick={onResetLabels}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Reset
                  </button>
                </p>
              )}
            </Field>

            <div className="flex items-center justify-between gap-2">
              <ToggleGroup
                variant="outline"
                size="sm"
                spacing={0}
                value={[s.labelFont]}
                onValueChange={(v) => v[0] && onChange({ labelFont: v[0] as Settings["labelFont"] })}
                aria-label="Font"
              >
                <ToggleGroupItem value="sans" className="px-2.5 font-sans">
                  Sans
                </ToggleGroupItem>
                <ToggleGroupItem value="serif" className="px-2.5 font-serif">
                  Serif
                </ToggleGroupItem>
                <ToggleGroupItem value="mono" className="px-2.5 font-mono">
                  Mono
                </ToggleGroupItem>
              </ToggleGroup>
              <ToggleGroup
                variant="outline"
                size="sm"
                spacing={0}
                value={[s.labelAlign]}
                onValueChange={(v) => v[0] && onChange({ labelAlign: v[0] as Settings["labelAlign"] })}
                aria-label="Alignment"
              >
                <ToggleGroupItem value="left" aria-label="Align left">
                  <AlignLeftIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Align center">
                  <AlignCenterIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Align right">
                  <AlignRightIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <Range label="Text size" value={s.labelSize} min={9} max={32} unit="px" onChange={(labelSize) => onChange({ labelSize })} />
          </>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="numbers" className="font-normal">
            Number each image
          </Label>
          <Switch id="numbers" checked={s.numbers} onCheckedChange={(numbers) => onChange({ numbers })} />
        </div>
      </Group>

      <Group title="Sheet">
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            value={s.title}
            placeholder="e.g. CFG 4 to 9, same seed"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
        {s.layout !== "film" && (
          <Field label="Background">
            <div className="flex items-center gap-2">
              {swatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Background ${c}`}
                  aria-pressed={s.background === c}
                  onClick={() => onChange({ background: c })}
                  className={cn(
                    "size-7 rounded-full border border-black/10 outline-offset-2 transition-[outline] focus-visible:outline-2 focus-visible:outline-ring dark:border-white/15",
                    s.background === c && "outline-2 outline-foreground",
                  )}
                  style={{ background: c }}
                />
              ))}
              <label
                className={cn(
                  "relative size-7 cursor-pointer overflow-hidden rounded-full border border-black/10 outline-offset-2 focus-within:outline-2 focus-within:outline-ring dark:border-white/15",
                  !swatches.includes(s.background) && "outline-2 outline-foreground",
                )}
                style={{
                  background: swatches.includes(s.background)
                    ? "conic-gradient(#e66, #ec6, #6c8, #6ae, #a6e, #e66)"
                    : s.background,
                }}
              >
                <span className="sr-only">Custom background color</span>
                <input
                  type="color"
                  value={s.background}
                  onChange={(e) => onChange({ background: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          </Field>
        )}
        <Range label="Margin" value={s.padding} min={0} max={120} unit="px" onChange={(padding) => onChange({ padding })} />
      </Group>

      <Group title="Export">
        <Field label="Width">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[s.exportWidth]}
            onValueChange={(v) => v[0] && onChange({ exportWidth: v[0] as Settings["exportWidth"] })}
            aria-label="Export width"
            className="w-full"
          >
            <ToggleGroupItem value="2048" className="flex-1">
              2048 px
            </ToggleGroupItem>
            <ToggleGroupItem value="4096" className="flex-1">
              4096 px
            </ToggleGroupItem>
            <ToggleGroupItem value="full" className="flex-1">
              Full size
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
      </Group>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[13px] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Range({
  label,
  value,
  min,
  max,
  unit = "",
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {value}
          {unit && <span className="text-muted-foreground"> {unit}</span>}
        </span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={1}
        aria-label={label}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
      />
    </div>
  )
}

// Small drawings of each layout so the choice reads at a glance.
function LayoutGlyph({ layout, active }: { layout: Layout; active: boolean }) {
  const fill = active ? "var(--marker)" : "currentColor"
  const o = active ? 1 : 0.55
  const r = (x: number, y: number, w: number, h: number, k: string | number) => (
    <rect key={k} x={x} y={y} width={w} height={h} rx={1} fill={fill} opacity={o} />
  )
  let shapes: React.ReactNode[] = []
  if (layout === "grid") shapes = [0, 1, 2, 3].map((i) => r((i % 2) * 11 + 3, Math.floor(i / 2) * 11 + 3, 9, 9, i))
  if (layout === "masonry")
    shapes = [r(3, 3, 9, 12, 1), r(3, 17, 9, 6, 2), r(14, 3, 9, 6, 3), r(14, 11, 9, 12, 4)]
  if (layout === "framed")
    shapes = [0, 1].map((i) => (
      <g key={i}>
        <rect x={i * 12 + 2} y={5} width={10} height={15} rx={1} fill="none" stroke={fill} opacity={o} />
        {r(i * 12 + 3.5, 6.5, 7, 8, `f${i}`)}
      </g>
    ))
  if (layout === "film")
    shapes = [
      <rect key="b" x={1} y={6} width={24} height={14} rx={1} fill={fill} opacity={o * 0.35} />,
      ...[0, 1, 2, 3, 4, 5].flatMap((i) => [r(i * 4 + 2, 7, 2, 1.5, `t${i}`), r(i * 4 + 2, 17.5, 2, 1.5, `u${i}`)]),
      r(3, 10, 9, 6, "a"),
      r(14, 10, 9, 6, "c"),
    ]
  if (layout === "row") shapes = [0, 1, 2].map((i) => r(i * 8 + 1.5, 8, 7, 10, i))
  return (
    <svg viewBox="0 0 26 26" className="size-7" aria-hidden>
      {shapes}
    </svg>
  )
}
