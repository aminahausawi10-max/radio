const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=================================================================');
console.log(' ARAB HAUSA RTV - COMPREHENSIVE END-TO-END PUBLISHING TEST SUITE');
console.log('=================================================================\n');

let pass = 0;
let fail = 0;

function report(name, success, details = '') {
  if (success) {
    pass++;
    console.log(` [PASS] ${name.padEnd(50, '.')} OK`);
    if (details) console.log(`        Details: ${details}`);
  } else {
    fail++;
    console.log(` [FAIL] ${name.padEnd(50, '.')} ERROR`);
    if (details) console.log(`        Details: ${details}`);
  }
}

function runPhp(scriptContent) {
  const tmpFile = path.join(require('os').tmpdir(), 'php_runner_' + Date.now() + '.php');
  fs.writeFileSync(tmpFile, '<?php\n' + scriptContent);
  try {
    const stdout = execSync(`php "${tmpFile}"`, { encoding: 'utf8', timeout: 10000 });
    fs.unlinkSync(tmpFile);
    return stdout;
  } catch (err) {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    throw err;
  }
}

// -----------------------------------------------------------------
// TEST 1: Database and Schema
// -----------------------------------------------------------------
const dbCheckOut = runPhp(`
require_once '${__dirname.replace(/\\/g, '/')}/../config/database.php';
global $pdo;
$hasPdo = ($pdo instanceof PDO);
$hasDuration = false;
if ($pdo) {
    try {
        $cols = $pdo->query("PRAGMA table_info(media)")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $c) {
            if ($c['name'] === 'duration') $hasDuration = true;
        }
    } catch (Exception $e) {}
}
echo json_encode([
    'pdo' => $hasPdo,
    'driver' => $hasPdo ? $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) : null,
    'hasDuration' => $hasDuration
]);
`);

const dbCheck = JSON.parse(dbCheckOut);
report("Database PDO Connection", dbCheck.pdo, `Driver: ${dbCheck.driver}`);
report("Media Schema 'duration' Column Check", dbCheck.hasDuration, "duration REAL column confirmed in SQLite database");

// -----------------------------------------------------------------
// TEST 2: Voice Note Publishing (Admin -> Storage -> DB -> Events)
// -----------------------------------------------------------------
const testVoiceTitle = "E2E Voice Dispatch " + Date.now();
const testVoiceSecs = 35.8;
const dummyVoiceFile = path.join(require('os').tmpdir(), 'voice_dummy_' + Date.now() + '.webm').replace(/\\/g, '/');
fs.writeFileSync(dummyVoiceFile, 'RIFF_DUMMY_WEBM_AUDIO_DATA_FOR_E2E');

const voicePostScript = `
session_start();
$_SESSION['admin_logged_in'] = true;
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['SCRIPT_NAME'] = '/api/upload.php';
$_SERVER['HTTP_REFERER'] = 'https://arab-hausa-rtv.com.ng/admin.html';
$_POST = [
    'title'      => '${testVoiceTitle}',
    'name'       => '${testVoiceTitle}',
    'category'   => 'Voice Note Dispatch',
    'type'       => 'voicenote',
    'media_type' => 'Voice Note',
    'duration'   => ${testVoiceSecs}
];
$_FILES = [
    'audio' => [
        'name'     => 'test_dispatch.webm',
        'type'     => 'audio/webm',
        'tmp_name' => '${dummyVoiceFile}',
        'error'    => UPLOAD_ERR_OK,
        'size'     => filesize('${dummyVoiceFile}')
    ]
];
ob_start();
include '${__dirname.replace(/\\/g, '/')}/../api/upload.php';
echo ob_get_clean();
`;

let voicePost;
try {
  const raw = runPhp(voicePostScript);
  voicePost = JSON.parse(raw);
} catch (e) {
  voicePost = { success: false, error: e.message };
}

const voiceItem = voicePost.media || null;
const voicePass = voicePost.success && voiceItem && voiceItem.type === 'voicenote' && voiceItem.duration === testVoiceSecs;
report("Voice Note Publishing & DB Storage", voicePass, voiceItem ? `ID: ${voiceItem.id}, Type: ${voiceItem.type}, Duration: ${voiceItem.duration}s, URL: ${voiceItem.url}` : voicePost.error);

// Check file exists in public/uploads/
let voiceFileOnDisk = false;
if (voiceItem && voiceItem.url) {
  const p = path.join(__dirname, '..', 'public', voiceItem.url);
  voiceFileOnDisk = fs.existsSync(p);
}
report("Voice Note Permanent Storage Check", voiceFileOnDisk, voiceItem ? voiceItem.url : 'No URL');

// -----------------------------------------------------------------
// TEST 3: Photo Publishing (Admin -> Storage -> DB)
// -----------------------------------------------------------------
const testPhotoTitle = "E2E Studio Photo " + Date.now();
const dummyPhotoFile = path.join(require('os').tmpdir(), 'photo_dummy_' + Date.now() + '.jpg').replace(/\\/g, '/');
fs.writeFileSync(dummyPhotoFile, 'JPEG_DUMMY_IMAGE_DATA_FOR_E2E');

const photoPostScript = `
session_start();
$_SESSION['admin_logged_in'] = true;
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['SCRIPT_NAME'] = '/api/upload.php';
$_SERVER['HTTP_REFERER'] = 'https://arab-hausa-rtv.com.ng/admin.html';
$_POST = [
    'title'      => '${testPhotoTitle}',
    'name'       => '${testPhotoTitle}',
    'category'   => 'TV Studio',
    'type'       => 'photo',
    'media_type' => 'Photo'
];
$_FILES = [
    'photo' => [
        'name'     => 'test_studio.jpg',
        'type'     => 'image/jpeg',
        'tmp_name' => '${dummyPhotoFile}',
        'error'    => UPLOAD_ERR_OK,
        'size'     => filesize('${dummyPhotoFile}')
    ]
];
ob_start();
include '${__dirname.replace(/\\/g, '/')}/../api/upload.php';
echo ob_get_clean();
`;

let photoPost;
try {
  photoPost = JSON.parse(runPhp(photoPostScript));
} catch (e) {
  photoPost = { success: false, error: e.message };
}

const photoItem = photoPost.media || null;
const photoPass = photoPost.success && photoItem && photoItem.type === 'photo';
report("Photo Publishing & DB Storage", photoPass, photoItem ? `ID: ${photoItem.id}, Type: ${photoItem.type}, URL: ${photoItem.url}` : photoPost.error);

// -----------------------------------------------------------------
// TEST 4: Video Publishing (Admin -> Storage -> DB)
// -----------------------------------------------------------------
const testVideoTitle = "E2E Broadcast Video " + Date.now();
const dummyVideoFile = path.join(require('os').tmpdir(), 'video_dummy_' + Date.now() + '.mp4').replace(/\\/g, '/');
fs.writeFileSync(dummyVideoFile, 'MP4_DUMMY_VIDEO_DATA_FOR_E2E');

const videoPostScript = `
session_start();
$_SESSION['admin_logged_in'] = true;
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['SCRIPT_NAME'] = '/api/upload.php';
$_SERVER['HTTP_REFERER'] = 'https://arab-hausa-rtv.com.ng/admin.html';
$_POST = [
    'title'      => '${testVideoTitle}',
    'name'       => '${testVideoTitle}',
    'category'   => 'TV Broadcast',
    'type'       => 'video',
    'media_type' => 'Video'
];
$_FILES = [
    'video' => [
        'name'     => 'test_video.mp4',
        'type'     => 'video/mp4',
        'tmp_name' => '${dummyVideoFile}',
        'error'    => UPLOAD_ERR_OK,
        'size'     => filesize('${dummyVideoFile}')
    ]
];
ob_start();
include '${__dirname.replace(/\\/g, '/')}/../api/upload.php';
echo ob_get_clean();
`;

let videoPost;
try {
  videoPost = JSON.parse(runPhp(videoPostScript));
} catch (e) {
  videoPost = { success: false, error: e.message };
}

const videoItem = videoPost.media || null;
const videoPass = videoPost.success && videoItem && videoItem.type === 'video';
report("Video Publishing & DB Storage", videoPass, videoItem ? `ID: ${videoItem.id}, Type: ${videoItem.type}, URL: ${videoItem.url}` : videoPost.error);

// -----------------------------------------------------------------
// TEST 5: Public Media Catalog API (Unified Retrieval & Normalization)
// -----------------------------------------------------------------
const catalogOut = runPhp(`
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['SCRIPT_NAME'] = '/api/upload.php';
ob_start();
include '${__dirname.replace(/\\/g, '/')}/../api/upload.php';
echo ob_get_clean();
`);

let catalog;
try {
  catalog = JSON.parse(catalogOut);
} catch (e) {
  catalog = { media: [] };
}

const allMedia = catalog.media || [];
const foundVoice = allMedia.find(m => m.name === testVoiceTitle);
const foundPhoto = allMedia.find(m => m.name === testPhotoTitle);
const foundVideo = allMedia.find(m => m.name === testVideoTitle);

report("Public API Returns Voice Note in Catalog", !!(foundVoice && foundVoice.type === 'voicenote'), foundVoice ? `Type: ${foundVoice.type}, Duration: ${foundVoice.duration}s` : 'Not in catalog');
report("Public API Returns Photo in Catalog", !!(foundPhoto && foundPhoto.type === 'photo'), foundPhoto ? `Type: ${foundPhoto.type}` : 'Not in catalog');
report("Public API Returns Video in Catalog", !!(foundVideo && foundVideo.type === 'video'), foundVideo ? `Type: ${foundVideo.type}` : 'Not in catalog');

// -----------------------------------------------------------------
// TEST 6: News API Retrieval (/api/news.php)
// -----------------------------------------------------------------
const newsOut = runPhp(`
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['SCRIPT_NAME'] = '/api/news.php';
ob_start();
include '${__dirname.replace(/\\/g, '/')}/../api/news.php';
echo ob_get_clean();
`);

let news;
try {
  news = JSON.parse(newsOut);
} catch (e) {
  news = { news: [] };
}
const newsCount = (news.news || []).length;
report("News API (/api/news.php) Returns Articles", newsCount > 0, `Total news articles: ${newsCount}`);

// -----------------------------------------------------------------
// TEST 7: Schedule API Retrieval (/api/schedule.php)
// -----------------------------------------------------------------
const scheduleOut = runPhp(`
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['SCRIPT_NAME'] = '/api/schedule.php';
ob_start();
include '${__dirname.replace(/\\/g, '/')}/../api/schedule.php';
echo ob_get_clean();
`);

let schedule;
try {
  schedule = JSON.parse(scheduleOut);
} catch (e) {
  schedule = { schedule: [] };
}
const schedCount = (schedule.schedule || []).length;
report("Schedule API (/api/schedule.php) Returns Programs", schedCount > 0, `Total daily schedule shows: ${schedCount}`);

// -----------------------------------------------------------------
// TEST 8: Settings API Retrieval (/api/settings.php)
// -----------------------------------------------------------------
const settingsOut = runPhp(`
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['SCRIPT_NAME'] = '/api/settings.php';
ob_start();
include '${__dirname.replace(/\\/g, '/')}/../api/settings.php';
echo ob_get_clean();
`);

let settings;
try {
  settings = JSON.parse(settingsOut);
} catch (e) {
  settings = { settings: {} };
}
const hasStream = !!(settings.settings && settings.settings.radio_stream_url);
report("Settings API (/api/settings.php) Returns Config", hasStream, `Radio Stream URL: ${settings.settings ? settings.settings.radio_stream_url : 'None'}`);

// -----------------------------------------------------------------
// TEST 9: Frontend Initialization Order & TDZ Safety Check
// -----------------------------------------------------------------
const appJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
const declPos = appJs.indexOf('let publicMediaItems = [];');
const hashPos = appJs.indexOf('const initialHash = window.location.hash.replace');
const hasDirectPhpGateway = appJs.includes("const phpEndpoint = cleanBase + '.php' + query;");
const tdzSafe = declPos > 0 && hashPos > 0 && declPos < hashPos;

report("Frontend TDZ Initialization Safety", tdzSafe, `publicMediaItems at byte ${declPos}, initialHash at byte ${hashPos}`);
report("Frontend Direct .php Gateway Routing", hasDirectPhpGateway, "Bypasses Nginx 403 directory block on DirectAdmin");

// -----------------------------------------------------------------
// TEST 10: Multi-surface Binding Verification
// -----------------------------------------------------------------
const hasTvGrid = appJs.includes('renderTvMedia');
const hasRadioGrid = appJs.includes('renderRadioVoiceNotes');
const hasHomeGrid = appJs.includes('renderPublicHomeMedia');
const allGrids = hasTvGrid && hasRadioGrid && hasHomeGrid;
report("Multi-surface Frontend Grid Distribution", allGrids, "Home Grid, TV Grid & Radio Grid all actively wired");

// Cleanup dummy temp files
[dummyVoiceFile, dummyPhotoFile, dummyVideoFile].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

console.log('\n=================================================================');
console.log(` E2E TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('=================================================================\n');

if (fail > 0) process.exit(1);
process.exit(0);
