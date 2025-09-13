const CryptoJS = require('crypto-js');
const { machineId } = require('node-machine-id');

const SECRET_KEY = 'HSR_CONSTRUCTION_ESTIMATOR_2024_SECURE_KEY_V1';

/**
 * Generate a license key for a specific machine
 */
function generateLicenseKey(machineId, expiryDate, features = ['full']) {
  const licenseData = {
    machineId,
    expiryDate: expiryDate.toISOString(),
    features,
    generated: new Date().toISOString()
  };

  const dataString = JSON.stringify(licenseData);
  const encrypted = CryptoJS.AES.encrypt(dataString, SECRET_KEY).toString();
  
  // Create a formatted license key
  const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encrypted));
  return formatLicenseKey(base64);
}

/**
 * Format license key with dashes
 */
function formatLicenseKey(key) {
  return key.match(/.{1,4}/g)?.join('-') || key;
}

/**
 * Main function to generate license
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('Usage: node generate-license.js <machine-id> <days-valid> [features]');
      console.log('Example: node generate-license.js ABC123 365 full');
      console.log('Example: node generate-license.js ABC123 30 basic,design');
      process.exit(1);
    }

    const targetMachineId = args[0];
    const daysValid = parseInt(args[1]);
    const features = args[2] ? args[2].split(',') : ['full'];

    if (isNaN(daysValid) || daysValid <= 0) {
      console.error('Error: Days valid must be a positive number');
      process.exit(1);
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysValid);

    const licenseKey = generateLicenseKey(targetMachineId, expiryDate, features);

    console.log('='.repeat(60));
    console.log('HSR Construction Estimator - License Generated');
    console.log('='.repeat(60));
    console.log(`Machine ID: ${targetMachineId}`);
    console.log(`Valid for: ${daysValid} days`);
    console.log(`Expires: ${expiryDate.toLocaleDateString()}`);
    console.log(`Features: ${features.join(', ')}`);
    console.log('');
    console.log('LICENSE KEY:');
    console.log(licenseKey);
    console.log('='.repeat(60));
    console.log('');
    console.log('Instructions:');
    console.log('1. Copy the license key above');
    console.log('2. Start the HSR Construction Estimator application');
    console.log('3. Enter the license key when prompted');
    console.log('4. The application will validate the key for the target machine');
    console.log('');

  } catch (error) {
    console.error('Error generating license:', error.message);
    process.exit(1);
  }
}

// Get current machine ID for reference
async function showCurrentMachineId() {
  try {
    const currentMachineId = await machineId();
    console.log('Current Machine ID:', currentMachineId);
    console.log('Use this ID to generate a license for this machine');
    console.log('');
  } catch (error) {
    console.error('Error getting machine ID:', error.message);
  }
}

// Check if user wants to see current machine ID
if (process.argv.includes('--current-machine')) {
  showCurrentMachineId();
} else {
  main();
}
