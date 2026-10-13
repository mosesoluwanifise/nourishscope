/** Typed access to the build-time data files in src/generated/. */
import countiesJson from '../../generated/counties.json';
import fieldsJson from '../../generated/fields.json';
import { stateMedians } from '../calc/health';
import type { County, FieldInfo } from './types';

export const COUNTIES = countiesJson as County[];
export const FIELDS = fieldsJson as FieldInfo[];

/** Fixed from all 120 counties (spec step 2), never from a selection. */
export const STATE_MEDIANS = stateMedians(COUNTIES);
