// Case-local ability usage survives reload; narrative clues remain session-only.
export function caseMetadata(s) {
 return {resonancePrecisionUsed:s.resonancePrecisionUsed===true,resonanceDodgeUsed:s.resonanceDodgeUsed===true,resonanceAttempts:s.resonanceAttempts||{}};
}
export function restoreCaseMetadata(d) {
 if(!d||typeof d!=='object')return {};
 return {resonancePrecisionUsed:d.resonancePrecisionUsed===true,resonanceDodgeUsed:d.resonanceDodgeUsed===true,resonanceAttempts:Object.fromEntries(Object.entries(d.resonanceAttempts||{}).filter(([k,v])=>/^[\w:-]+$/.test(k)&&Number.isSafeInteger(v)&&v>0))};
}
export function cleanCompletion(s){return s.completed&&s.meterFuse==='intact'&&s.penalty===0&&Object.keys(s.evidence).length>=6;}
export function earnedPrisms(street,kickback){return Number(street.completed===true&&street.xp===120&&street.prisms===1)+Number(kickback.completed===true&&kickback.rewardClaimed===true&&kickback.xp===100&&kickback.prisms===1);}
