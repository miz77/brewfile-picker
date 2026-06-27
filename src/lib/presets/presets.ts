import { parse } from 'yaml'
import blankRaw from '../../../presets/blank.yml?raw'
import lab2026Raw from '../../../presets/lab-2026.yml?raw'
import { parsePreset, type Preset } from '../schemas/preset'

const presets = [parsePreset(parse(lab2026Raw)), parsePreset(parse(blankRaw))]

export function listPresets(): Preset[] {
  return presets
}

export function getPresetById(id: string): Preset {
  return presets.find((preset) => preset.id === id) ?? presets[0]
}
