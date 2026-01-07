// --- AUTO-FIX: Suppress Confirm Dialogs ---
window.confirm = function (message) {
    console.log("Suppressed confirm dialog:", message);
    return true; // Auto-click OK
};
window.onbeforeunload = null; // Prevent "Are you sure you want to leave?"
// ------------------------------------------
// LV50 Technique Power Lookup Table
// Base Power -> Evolution 1-6
const techniqueLookup = {
    "30": [115, 115, 115, 115, 115, 115],
    "50": [175, 192, 210, 227, 245, 262],
    "60": [210, 231, 252, 273, 294, 315],
    "70": [255, 280, 306, 331, 357, 382],
    "85": [312, 343, 374, 405, 436, 468],
    "100": [370, 407, 444, 481, 518, 555]
};
const dom = {
    // Mode UI
    inputsMode: document.getElementsByName('inputMode'),
    presetContainer: document.getElementById('presetContainer'),
    manualContainer: document.getElementById('manualContainer'),
    // Preset Internal State
    calcKick: document.getElementById('calcKick'),
    calcControl: document.getElementById('calcControl'),
    // Manual Inputs
    kickManual: document.getElementById('kickManual'),
    controlManual: document.getElementById('controlManual'),
    // Common
    basePower: document.getElementById('basePower'),
    evolution: document.getElementById('evolution'),
    multiplier: document.getElementById('multiplier'),
    charMatchup: document.getElementById('charMatchup'),
    techMatchup: document.getElementById('techMatchup'),
    specialCond: document.getElementById('specialCond'),
    specialCondValue: document.getElementById('specialCondValue'),
    // Rarity (Preset)
    rarity: document.getElementById('rarity'),
    // Beans (Preset)
    kickBean: document.getElementById('kickBean'),
    controlBean: document.getElementById('controlBean'),
    // Equipment (Preset)
    equipBoots: document.getElementById('equipBoots'),
    equipBracelet: document.getElementById('equipBracelet'),
    equipPendant: document.getElementById('equipPendant'),
    equipSpecial: document.getElementById('equipSpecial'),
    // Preset Categories
    presetCategory: document.getElementById('presetCategory'),
    presetsStandard: document.getElementById('presets-standard'),
    presetsBasara: document.getElementById('presets-basara'),
    presetsHero: document.getElementById('presets-hero'),
    techniquePowerDisplay: document.getElementById('techniquePowerDisplay'),
    characterPower: document.getElementById('characterPower'),
    totalAt: document.getElementById('totalAt')
};
// State
let currentBaseKick = 121; // Default FW① (Goenji-type)
let currentBaseControl = 115;
let isManual = false;
window.setPreset = function (k, c, el) {
    currentBaseKick = k;
    currentBaseControl = c;
    // Update Active State
    document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    }
    calculate();
};
window.togglePresetCategory = function () {
    const cat = dom.presetCategory.value;
    // Hide all first
    dom.presetsStandard.classList.add('hidden');
    dom.presetsBasara.classList.add('hidden');
    dom.presetsHero.classList.add('hidden');
    // Show selected
    if (cat === 'standard') {
        dom.presetsStandard.classList.remove('hidden');
    } else if (cat === 'basara') {
        dom.presetsBasara.classList.remove('hidden');
    } else if (cat === 'hero') {
        dom.presetsHero.classList.remove('hidden');
    }
};
window.setMaxBeans = function (type) {
    if (type === 'kick') {
        dom.kickBean.value = 82;
    } else if (type === 'control') {
        dom.controlBean.value = 82;
    } else if (type === 'all') {
        dom.kickBean.value = 82;
        dom.controlBean.value = 82;
    }
    calculate();
};
window.setClearBeans = function (type) {
    if (type === 'kick') {
        dom.kickBean.value = 0;
    } else if (type === 'control') {
        dom.controlBean.value = 0;
    } else if (type === 'all') {
        dom.kickBean.value = 0;
        dom.controlBean.value = 0;
    }
    calculate();
};
window.addMultiplier = function (val, isSet) {
    const input = document.getElementById('multiplier');
    let current = parseFloat(input.value) || 0;
    if (isSet) {
        current = val;
    } else {
        current += val;
    }
    // Prevent negative? No, -10% is valid if correcting.
    input.value = current;
    calculate();
};
// New UX Functions
window.setMode = function (mode) {
    isManual = (mode === 'manual');
    // Update Tabs
    document.getElementById('tab-preset').className = isManual ? 'tab-btn' : 'tab-btn active';
    document.getElementById('tab-manual').className = isManual ? 'tab-btn active' : 'tab-btn';
    // Update Visibility
    if (isManual) {
        dom.presetContainer.classList.add('hidden');
        dom.manualContainer.classList.remove('hidden');
    } else {
        dom.presetContainer.classList.remove('hidden');
        dom.manualContainer.classList.add('hidden');
    }
    calculate();
};
window.setSegment = function (selectId, val, btn) {
    if (btn.classList.contains('disabled')) return;
    // 1. Update Hidden Select
    const select = document.getElementById(selectId);
    if (select) {
        select.value = val;
        // Trigger generic input event if needed, but we call calculate directly
    }
    // 2. Update Visuals
    // Find all buttons in the same container (segmented-control)
    const container = btn.parentElement;
    const allBtns = container.querySelectorAll('.segment-btn');
    allBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // 3. Recalculate
    calculate();
};
// Toast Notification Helper
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    // Clear any existing timeout if we were to make this robust, but simple is fine
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}
window.copyResults = function () {
    const text = `
Inazuma Eleven Calc (LV50):
---------------------------
Kick: ${dom.calcKick.textContent}
Ctrl: ${dom.calcControl.textContent}
Char Power: ${dom.characterPower.textContent}
Tech Power: ${dom.techniquePowerDisplay.textContent}
Total AT: ${dom.totalAt.textContent}
---------------------------
`.trim();
    navigator.clipboard.writeText(text).then(() => {
        showToast("コピーしました！");
    }).catch(err => {
        console.error('Failed to copy', err);
        alert('Copy failed');
    });
};
/* 
   REMOVED: Old toggleMode and radio listeners.
   The rest of the file relies on DOM elements that still exist (hidden selects), so logic holds.
   Just need to ensure dom.inputsMode doesn't crash initialization (it's empty now).
*/
// ... (Rest of logic) ...
// Since calculate() reads from dom.inputsMode? No, it used to. 
// calculate() checks global 'isManual'. Correct.
// We need to remove the initialization loop for radios properly.
function getTechniquePower(base, evo) {
    const list = techniqueLookup[base];
    if (!list) return 0;
    const evoIndex = parseInt(evo) - 1;
    if (evoIndex < 0 || evoIndex >= list.length) return 0;
    return list[evoIndex];
}
function parseEquip(val) {
    if (!val) return { k: 0, c: 0 };
    const parts = val.split(',');
    return {
        k: parseFloat(parts[0]) || 0,
        c: parseFloat(parts[1]) || 0
    };
}
// Victory Road States
let superMoveState = 'none'; // 'none', 'od', 'keshin', 'armed', 'accel', 'boost30'
window.setSuperMove = function (mode, btn) {
    superMoveState = mode;
    // Update UI
    const container = btn.parentElement;
    container.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // UI Feedback: Update Advantage Buttons for Accel
    const charBtn = document.getElementById('btnCharAdv');
    const techBtn = document.getElementById('btnTechAdv');
    if (mode === 'accel') {
        if (charBtn) charBtn.textContent = "有利 (2.0)★";
        if (techBtn) techBtn.textContent = "有利 (2.0)★";
    } else {
        if (charBtn) charBtn.textContent = "有利 (1.2)";
        if (techBtn) techBtn.textContent = "有利 (1.2)";
    }
    calculate();
};
function toggleMatchupLock(locked) {
    // Target 1: Tech Matchup (Locked if BasePower=30)
    const techId = 'techMatchup';
    const techSelect = document.getElementById(techId);
    if (techSelect) {
        let container = techSelect.nextElementSibling;
        if (!container || !container.classList.contains('segmented-control')) {
            container = techSelect.parentElement.querySelector('.segmented-control');
        }
        if (container) {
            const buttons = container.querySelectorAll('.segment-btn');
            if (locked) {
                techSelect.value = '1.0';
                buttons.forEach(b => {
                    const isNormal = b.getAttribute('onclick') && b.getAttribute('onclick').includes("'1.0'");
                    if (isNormal) {
                        b.classList.add('active');
                        b.classList.remove('disabled');
                    } else {
                        b.classList.remove('active');
                        b.classList.add('disabled');
                    }
                });
            } else {
                buttons.forEach(b => b.classList.remove('disabled'));
            }
        }
    }
    // Target 2: Char Matchup (Always Unlocked)
    // Ensure we remove disabled state if it was previously set
    const charId = 'charMatchup';
    const charSelect = document.getElementById(charId);
    if (charSelect) {
        let container = charSelect.nextElementSibling;
        if (!container || !container.classList.contains('segmented-control')) {
            container = charSelect.parentElement.querySelector('.segmented-control');
        }
        if (container) {
            container.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('disabled'));
        }
    }
}
// --- Sync Logic ---
let manualBonus = 0;
window.togglePassives = function () {
    const el = document.getElementById('passiveContainer');
    const btn = document.getElementById('btnTogglePassive');
    if (el.style.display === 'none') {
        el.style.display = 'block';
        btn.textContent = 'Passives ▲';
    } else {
        el.style.display = 'none';
        btn.textContent = 'Passives ▼';
    }
};
window.handleManualInput = function (val) {
    const total = parseFloat(val) || 0;
    const passiveSum = getPassiveSum();
    manualBonus = total - passiveSum;
    calculate();
};
window.updateFromPassive = function () {
    const passiveSum = getPassiveSum();
    const total = manualBonus + passiveSum;
    const el = document.getElementById('multiplier');
    if (el) el.value = total;
    calculate();
};
window.addManualBonus = function (amount) {
    manualBonus += amount;
    const passiveSum = getPassiveSum();
    const total = manualBonus + passiveSum;
    const el = document.getElementById('multiplier');
    if (el) el.value = total;
    calculate();
};
window.clearBonuses = function () {
    manualBonus = 0;
    document.querySelectorAll('.passive-grid input').forEach(i => i.value = '');
    const el = document.getElementById('multiplier');
    if (el) el.value = 0;
    calculate();
};
function getPassiveSum() {
    let sum = 0;
    document.querySelectorAll('.passive-grid input').forEach(i => {
        let val = parseFloat(i.value) || 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        sum += val;
    });
    return sum;
}
function calculate() {
    try {
        // --- UX Logic: Lock Evolution & Matchup if Power is 30 ---
        if (dom.basePower && dom.evolution) {
            const is30 = (dom.basePower.value === '30');
            // Lock Matchups
            toggleMatchupLock(is30);
            const evoContainer = dom.evolution.parentElement.querySelector('.segmented-control');
            if (evoContainer) {
                const btns = evoContainer.querySelectorAll('.segment-btn');
                if (is30) {
                    // Force state to Base (1) if not already
                    if (dom.evolution.value !== '1') {
                        dom.evolution.value = '1';
                        // Update visuals manually since setSegment wasn't clicked
                        btns.forEach(b => b.classList.remove('active'));
                        if (btns[0]) btns[0].classList.add('active');
                    }
                    // Disable Buttons 2-6 (Indices 1-5)
                    btns.forEach((b, i) => {
                        if (i > 0) b.classList.add('disabled');
                    });
                } else {
                    // Enable All
                    btns.forEach(b => b.classList.remove('disabled'));
                }
            }
        }
        // -----------------------------------------------
        console.log('Calculating...', { isManual, cat: dom.presetCategory.value });
        let kickEff = 0;
        let controlEff = 0;
        if (isManual) {
            // Direct Input Mode
            kickEff = parseFloat(dom.kickManual.value) || 0;
            controlEff = parseFloat(dom.controlManual.value) || 0;
            // Update display for Manual Mode
            if (dom.calcKick) dom.calcKick.textContent = kickEff;
            if (dom.calcControl) dom.calcControl.textContent = controlEff;
        } else {
            // Preset Mode Logic
            // 1. Base Stats (from Buttons)
            // 2. Rarity Logic (Now Implicit based on Category)
            const cat = dom.presetCategory ? dom.presetCategory.value : 'standard';
            let rarityMult = 1.0;
            if (cat === 'standard') {
                rarityMult = 1.4; // Legendary fixed
            }
            // Future: Handle BASARA/HERO multipliers if different
            // 3. Beans
            const kBean = parseFloat(dom.kickBean.value) || 0;
            const cBean = parseFloat(dom.controlBean.value) || 0;
            // 4. Equipment
            const eBoots = parseEquip(dom.equipBoots.value);
            const eBrace = parseEquip(dom.equipBracelet.value);
            const ePend = parseEquip(dom.equipPendant.value);
            const eSpec = parseEquip(dom.equipSpecial.value);
            const totalEquipKick = eBoots.k + eBrace.k + ePend.k + eSpec.k;
            const totalEquipCtrl = eBoots.c + eBrace.c + ePend.c + eSpec.c;
            // Calculation
            kickEff = Math.floor(currentBaseKick * rarityMult) + kBean + totalEquipKick;
            controlEff = Math.floor(currentBaseControl * rarityMult) + cBean + totalEquipCtrl;
            // Update display
            if (dom.calcKick) dom.calcKick.textContent = kickEff;
            if (dom.calcControl) dom.calcControl.textContent = controlEff;
        }
        // --- Common Calculation ---
        // Character Matchup
        let charMultiplier = parseFloat(dom.charMatchup.value);
        // Element Accel Logic: If 'accel' and Advantage (1.2), boost to 2.0
        if (superMoveState === 'accel' && charMultiplier === 1.2) {
            charMultiplier = 2.0;
        }
        // Character Power (Stats only)
        const statsSum = kickEff + controlEff;
        const characterPowerBase = statsSum * charMultiplier;
        // Apply multipliers (Super Moves, Passives, etc)
        // 1. Manual + Passives
        // The Multiplier Input now holds the TOTAL of Manual + Passives
        let bonusPercent = (parseFloat(dom.multiplier.value) || 0);
        // 2. Super Moves (Victory Road)
        if (superMoveState === 'od') bonusPercent += 50;
        if (superMoveState === 'keshin') bonusPercent += 40;
        if (superMoveState === 'armed') bonusPercent += 20;
        if (superMoveState === 'accel') bonusPercent += 30;
        if (superMoveState === 'boost30') bonusPercent += 30;
        let totalMultiplier = 1 + (bonusPercent / 100);
        const hasSpecialCond = dom.specialCond.checked;
        const specialMultiplier = hasSpecialCond ? (parseFloat(dom.specialCondValue.value) || 1.0) : 1.0;
        totalMultiplier *= specialMultiplier;
        const characterPowerFinal = Math.floor(characterPowerBase * totalMultiplier);
        if (dom.characterPower) dom.characterPower.textContent = characterPowerFinal;
        // --- Technique Power ---
        const base = dom.basePower.value;
        const evo = dom.evolution.value;
        // Use lookup directly
        const baseTechPower = techniqueLookup[base][parseInt(evo) - 1];
        // Tech Matchup
        let techMatchupMult = parseFloat(dom.techMatchup.value);
        // Element Accel Logic: If 'accel' and Advantage (1.2), boost to 2.0
        if (superMoveState === 'accel' && techMatchupMult === 1.2) {
            techMatchupMult = 2.0;
        }
        // Final Tech Calc
        let finalTech = baseTechPower;
        if (superMoveState === 'armed') {
            finalTech *= 1.3; // Armed Boost
        }
        // Apply Matchup
        finalTech *= techMatchupMult;
        finalTech = Math.floor(finalTech);
        if (dom.techniquePowerDisplay) dom.techniquePowerDisplay.textContent = finalTech;
        // Total AT = (Char + Tech) * Total Multiplier
        const rawSum = characterPowerBase + finalTech;
        const totalAT = Math.floor(rawSum * totalMultiplier);
        if (dom.totalAt) dom.totalAt.textContent = totalAT;
    } catch (e) {
        console.error(e);
        alert('Error: ' + e.message);
    }
}
// Event Listeners
const inputs = [
    dom.basePower, dom.evolution,
    dom.multiplier, dom.charMatchup, dom.techMatchup,
    dom.specialCond, dom.specialCondValue,
    // Rarity Removed
    // rarity: document.getElementById('rarity'),
    // Beans (Preset)
    dom.kickBean, dom.controlBean,
    dom.equipBoots, dom.equipBracelet, dom.equipPendant, dom.equipSpecial,
    // Manual Inputs
    dom.kickManual, dom.controlManual,
    // Triggers
    dom.presetCategory
];
inputs.forEach(input => {
    input.addEventListener('input', calculate);
    input.addEventListener('change', calculate);
});
// Mode Toggle Init - Handled by setMode
// for (const r of dom.inputsMode) { ... } REMOVED
// Special condition toggle
dom.specialCond.addEventListener('change', () => {
    dom.specialCondValue.disabled = !dom.specialCond.checked;
    calculate();
});
// Initial
setMode('preset');
// Passive Inputs Listeners
const passiveGridInputs = document.querySelectorAll('.passive-grid input');
passiveGridInputs.forEach(input => {
    // Set attributes
    input.min = 0;
    input.max = 100;
    input.addEventListener('input', updateFromPassive);
    input.addEventListener('change', function () {
        // Strict Clamp on Change/Blur
        let val = parseFloat(this.value) || 0;
        if (val < 0) { val = 0; this.value = 0; }
        if (val > 100) { val = 100; this.value = 100; }
        updateFromPassive();
    });
});
calculate();
