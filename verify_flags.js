const crypto = require('crypto');

// The same secret used in server.js
const APP_SECRET = 'super_secret_bbq_key_2026';

/**
 * Genereert de verwachte flag voor een specifieke student en challenge
 */
function generateExpectedFlag(studentId, challengeCode) {
    const hash = crypto.createHmac('sha256', APP_SECRET)
                       .update(`${studentId}_${challengeCode}`)
                       .digest('hex')
                       .substring(0, 6);
    return `FLAG{${studentId}_${hash}_${challengeCode}}`;
}

// Haal argumenten op uit de command line
const inputFlag = process.argv[2];

if (!inputFlag) {
    console.log("Gebruik: node verify_flags.js <FLAG>");
    console.log("Voorbeeld: node verify_flags.js FLAG{123456_a1b2c3_RECON}");
    process.exit(1);
}

// Parse de ingevoerde flag
// Verwacht formaat: FLAG{studentId_hash_challengeCode}
const match = inputFlag.match(/^FLAG\{(.+?)_([a-f0-9]{6})_([A-Z]+)\}$/);

if (!match) {
    console.log("❌ FOUT: Het formaat van de flag is ongeldig.");
    process.exit(1);
}

const studentId = match[1];
const challengeCode = match[3];

const expectedFlag = generateExpectedFlag(studentId, challengeCode);

console.log(`Bezig met verifiëren van flag voor student: ${studentId}, challenge: ${challengeCode}...`);

if (inputFlag === expectedFlag) {
    console.log("✅ SUCCES: Deze flag is ECHT en wiskundig correct.");
} else {
    console.log("❌ FOUT: Deze flag is NEP (verzonnen of van iemand anders gekopieerd).");
    console.log(`   Verwachte flag was: ${expectedFlag}`);
}
