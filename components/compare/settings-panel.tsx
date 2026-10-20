"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fieldNames, type Align, type LabelField, type Layout, type Preset, type Settings } from "@/lib/sheet"

type Props = {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  editedLabels: number
  onResetLabels: () => void
  onFillHeaders: (which: "cols" | "rows") => void
  closed: string[]
  onToggleSection: (name: string, open: boolean) => void
  presets: Preset[]
  onSavePreset: () => void
  onApplyPreset: (i: number) => void
  onDeletePreset: (i: number) => void
  onResetSettings: () => void
}

const layouts: { value: Layout; name: string; icon: string }[] = [
  { value: "grid", name: "Grid", icon: "icon-[ph--squares-four]" },
  { value: "masonry", name: "Masonry", icon: "icon-[tabler--layout-board]" },
  { value: "framed", name: "Framed", icon: "icon-[ph--frame-corners]" },
  { value: "film", name: "Film", icon: "icon-[ph--film-strip]" },
  { value: "row", name: "Row", icon: "icon-[ph--columns]" },
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
  "2/3": "Portrait 2:3",
  "3/4": "Portrait 3:4",
  "4/3": "Landscape 4:3",
  "16/9": "Wide 16:9",
}

const widths = { fit: "Fit window", "1200": "1200 px", "1600": "1600 px", "2400": "2400 px" }
const lineLimits = { "0": "No limit", "1": "1 line", "2": "2 lines", "3": "3 lines" }
const bgSwatches = ["#ffffff", "#e9e9e7", "#2b2b2b", "#000000"]

export function SettingsPanel(p: Props) {
  const { settings: s, onChange } = p
  const section = (name: string) => ({
    open: !p.closed.includes(name),
    onOpenChange: (open: boolean) => p.onToggleSection(name, open),
  })
  const gridLike = s.layout !== "masonry"

  return (
    // suppressHydrationWarning: password managers (e.g. Proton Pass) tag form containers before hydration.
    <div suppressHydrationWarning className="flex flex-col pb-10">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 px-2" />}>
            <Icon className="icon-[ph--bookmark-simple]" />
            Presets
            <Icon className="icon-[ph--caret-down] size-3 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={p.onSavePreset}>
              <Icon className="icon-[ph--plus]" />
              Save current settings
            </DropdownMenuItem>
            {p.presets.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Saved</DropdownMenuLabel>
                  {p.presets.map((preset, i) => (
                    <DropdownMenuItem key={preset.name + i} onClick={() => p.onApplyPreset(i)} className="group/preset">
                      <span className="truncate">{preset.name}</span>
                      <button
                        type="button"
                        aria-label={`Delete ${preset.name}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          p.onDeletePreset(i)
                        }}
                        className="ml-auto grid size-6 place-items-center rounded text-muted-foreground opacity-0 group-hover/preset:opacity-100 group-data-highlighted/preset:opacity-100 hover:text-destructive"
                      >
                        <Icon className="icon-[ph--trash] size-3.5" />
                      </button>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" className="ml-auto gap-1.5 px-2 text-muted-foreground" onClick={p.onResetSettings}>
          <Icon className="icon-[ph--arrow-counter-clockwise]" />
          Reset
        </Button>
      </div>

      <Section title="Layout" {...section("layout")}>
        <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Layout">
          {layouts.map((l) => {
            const on = s.layout === l.value
            return (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange({ layout: l.value })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md pt-2 pb-1.5 text-[11px] text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  on && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                )}
              >
                <Icon className={cn(l.icon, "size-6")} />
                {l.name}
              </button>
            )
          })}
        </div>
        {s.layout !== "row" && (
          <Range label="Columns" value={s.columns} min={1} max={12} onChange={(columns) => onChange({ columns })} />
        )}
        <Range label="Spacing" value={s.gap} min={0} max={64} unit="px" onChange={(gap) => onChange({ gap })} />
        {s.layout !== "film" && (
          <Range label="Corners" value={s.radius} min={0} max={32} unit="px" onChange={(radius) => onChange({ radius })} />
        )}
        {gridLike && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <Field label="Shape">
              <Choice items={aspects} value={s.aspect} onChange={(aspect) => onChange({ aspect })} />
            </Field>
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[s.fit]}
              onValueChange={(v) => v[0] && onChange({ fit: v[0] as Settings["fit"] })}
              aria-label="Fit"
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
        <Field label="Sheet width">
          <Choice items={widths} value={s.sheetWidth} onChange={(sheetWidth) => onChange({ sheetWidth })} />
        </Field>
      </Section>

      <Section title="Labels" {...section("labels")}>
        <Field label="Position">
          <Choice items={positions} value={s.labelPos} onChange={(labelPos) => onChange({ labelPos })} />
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
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {fieldNames[f]}
                    </button>
                  )
                })}
              </div>
              {p.editedLabels > 0 && (
                <p className="text-xs text-muted-foreground">
                  {p.editedLabels} edited by hand.{" "}
                  <button type="button" onClick={p.onResetLabels} className="underline underline-offset-2 hover:text-foreground">
                    Reset
                  </button>
                </p>
              )}
            </Field>

            {s.labelFields.includes("prompt") && (
              <Toggle
                id="quality"
                label="Hide quality tags"
                checked={s.hideQualityTags}
                onChange={(hideQualityTags) => onChange({ hideQualityTags })}
              />
            )}

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
              <AlignPicker value={s.labelAlign} onChange={(labelAlign) => onChange({ labelAlign })} label="Label alignment" />
            </div>
            <Range label="Text size" value={s.labelSize} min={9} max={40} unit="px" onChange={(labelSize) => onChange({ labelSize })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Weight">
                <Choice
                  items={{ "400": "Regular", "500": "Medium", "700": "Bold" }}
                  value={s.labelWeight}
                  onChange={(labelWeight) => onChange({ labelWeight })}
                />
              </Field>
              <Field label="Max lines">
                <Choice
                  items={lineLimits}
                  value={String(s.labelLines) as keyof typeof lineLimits}
                  onChange={(v) => onChange({ labelLines: Number(v) })}
                />
              </Field>
            </div>
            <Field label="Text color">
              <ColorRow
                value={s.labelColor}
                swatches={["#1d1f23", "#ffffff", "#6b6f76"]}
                auto
                onChange={(labelColor) => onChange({ labelColor })}
              />
            </Field>
          </>
        )}

        <Toggle id="numbers" label="Number each image" checked={s.numbers} onChange={(numbers) => onChange({ numbers })} />
      </Section>

      <Section title="Headers" {...section("headers")}>
        {gridLike ? (
          <>
            <p className="text-xs text-muted-foreground">One per line. Handy for XY grids, like CFG across and samplers down.</p>
            <HeaderField
              label="Column headers"
              value={s.colHeaders}
              onChange={(colHeaders) => onChange({ colHeaders })}
              onFill={() => p.onFillHeaders("cols")}
            />
            {s.layout !== "row" && (
              <HeaderField
                label="Row headers"
                value={s.rowHeaders}
                onChange={(rowHeaders) => onChange({ rowHeaders })}
                onFill={() => p.onFillHeaders("rows")}
              />
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Headers need a layout with fixed columns. Masonry doesn&apos;t have them.</p>
        )}
      </Section>

      <Section title="Text" {...section("text")}>
        <Field label="Title" htmlFor="title">
          <Input id="title" value={s.title} placeholder="e.g. CFG 4 to 9, same seed" onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label="Subtitle" htmlFor="subtitle">
          <Textarea
            id="subtitle"
            rows={2}
            value={s.subtitle}
            placeholder="Prompt, model or notes"
            onChange={(e) => onChange({ subtitle: e.target.value })}
            className="min-h-0 resize-y"
          />
        </Field>
        <Field label="Footer" htmlFor="footer">
          <Input id="footer" value={s.footer} placeholder="e.g. your name or a date" onChange={(e) => onChange({ footer: e.target.value })} />
        </Field>
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1">
            <Range label="Title size" value={s.titleSize} min={14} max={72} unit="px" onChange={(titleSize) => onChange({ titleSize })} />
          </div>
          <AlignPicker value={s.titleAlign} onChange={(titleAlign) => onChange({ titleAlign })} label="Title alignment" />
        </div>
      </Section>

      <Section title="Style" {...section("style")}>
        {s.layout !== "film" && (
          <Field label="Background">
            <ColorRow value={s.background} swatches={bgSwatches} onChange={(background) => onChange({ background })} />
          </Field>
        )}
        <Range label="Margin" value={s.padding} min={0} max={160} unit="px" onChange={(padding) => onChange({ padding })} />
        {s.layout !== "film" && (
          <>
            <Range label="Image border" value={s.border} min={0} max={12} unit="px" onChange={(border) => onChange({ border })} />
            {s.border > 0 && (
              <Field label="Border color">
                <ColorRow value={s.borderColor} swatches={["#000000", "#ffffff", "#9a9da3"]} onChange={(borderColor) => onChange({ borderColor })} />
              </Field>
            )}
          </>
        )}
        {s.layout !== "film" && s.layout !== "framed" && (
          <Toggle id="shadow" label="Drop shadow" checked={s.shadow} onChange={(shadow) => onChange({ shadow })} />
        )}
      </Section>

      <Section title="Export" {...section("export")}>
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
        <Field label="Format">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[s.exportFormat]}
            onValueChange={(v) => v[0] && onChange({ exportFormat: v[0] as Settings["exportFormat"] })}
            aria-label="Format"
            className="w-full"
          >
            <ToggleGroupItem value="png" className="flex-1">
              PNG
            </ToggleGroupItem>
            <ToggleGroupItem value="jpeg" className="flex-1">
              JPG
            </ToggleGroupItem>
            <ToggleGroupItem value="webp" className="flex-1">
              WebP
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        {s.exportFormat !== "png" && (
          <Range label="Quality" value={s.exportQuality} min={50} max={100} unit="%" onChange={(exportQuality) => onChange({ exportQuality })} />
        )}
        {s.exportFormat !== "jpeg" && s.layout !== "film" && (
          <Toggle id="transparent" label="Transparent background" checked={s.transparent} onChange={(transparent) => onChange({ transparent })} />
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="border-b last:border-b-0">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-3.5 text-[13px] font-semibold outline-none hover:bg-muted/50 focus-visible:bg-muted">
        {title}
        <Icon className="icon-[ph--caret-down] size-3.5 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 px-5 pb-5">{children}</CollapsibleContent>
    </Collapsible>
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

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function Choice<T extends string>({ items, value, onChange }: { items: Record<T, string>; value: T; onChange: (v: T) => void }) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v && onChange(v as T)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(items) as [T, string][]).map(([v, name]) => (
          <SelectItem key={v} value={v}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AlignPicker({ value, onChange, label }: { value: Align; onChange: (v: Align) => void; label: string }) {
  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as Align)}
      aria-label={label}
    >
      <ToggleGroupItem value="left" aria-label="Left">
        <Icon className="icon-[ph--text-align-left]" />
      </ToggleGroupItem>
      <ToggleGroupItem value="center" aria-label="Center">
        <Icon className="icon-[ph--text-align-center]" />
      </ToggleGroupItem>
      <ToggleGroupItem value="right" aria-label="Right">
        <Icon className="icon-[ph--text-align-right]" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function HeaderField({
  label,
  value,
  onChange,
  onFill,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onFill: () => void
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-")
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <button type="button" onClick={onFill} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Fill from labels
        </button>
      </div>
      <Textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="min-h-0 resize-y font-mono text-xs" />
    </div>
  )
}

export function ColorRow({
  value,
  swatches,
  auto,
  onChange,
}: {
  value: string
  swatches: string[]
  auto?: boolean
  onChange: (v: string) => void
}) {
  const custom = value !== "" && !swatches.includes(value)
  const ring = "outline-2 outline-offset-2 outline-foreground"
  return (
    <div className="flex flex-wrap items-center gap-2">
      {auto && (
        <button
          type="button"
          aria-pressed={value === ""}
          onClick={() => onChange("")}
          className={cn(
            "h-7 rounded-full border px-2.5 text-xs text-muted-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring",
            value === "" && ring,
          )}
        >
          Auto
        </button>
      )}
      {swatches.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "size-7 rounded-full border border-black/10 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring dark:border-white/15",
            value === c && ring,
          )}
          style={{ background: c }}
        />
      ))}
      <label
        className={cn(
          "relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-black/10 outline-offset-2 focus-within:outline-2 focus-within:outline-ring dark:border-white/15",
          custom && ring,
        )}
        style={{ background: custom ? value : undefined }}
        title="Custom color"
      >
        {!custom && <Icon className="icon-[ph--eyedropper] size-3.5 text-muted-foreground" />}
        <span className="sr-only">Custom color</span>
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
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
