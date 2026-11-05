<?php
/**
 * Arab Hausa RTV - Real-Time Event Dispatcher (Dual Mode: Server-Sent Events & Fast JSON Polling)
 */

if (isset($_COOKIE[session_name()])) {
    @session_start();
    @session_write_close();
}

require_once __DIR__ . "/../config/database.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Last-Event-ID, Content-Type, Accept");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$lastEventId = (float)($_SERVER['HTTP_LAST_EVENT_ID'] ?? ($_GET['last_id'] ?? 0));
$isStream = isset($_GET['stream']) || (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'text/event-stream') !== false);

function getRecentEventsAfter($afterId) {
    $events = getLocalJsonStore('events.json');
    $filtered = array_values(array_filter($events, function($e) use ($afterId) {
        return (float)($e['id'] ?? 0) > (float)$afterId;
    }));
    return $filtered;
}

// -------------------------------------------------------------
// MODE A: SERVER-SENT EVENTS (SSE) - 0-latency live updates
// -------------------------------------------------------------
if ($isStream) {
    @set_time_limit(60);
    @ini_set('max_execution_time', '60');
    while (ob_get_level()) {
        ob_end_clean();
    }

    header("Content-Type: text/event-stream; charset=utf-8");
    header("Cache-Control: no-cache, no-store, must-revalidate");
    header("Connection: keep-alive");
    header("X-Accel-Buffering: no");

    // Send retry delay for reconnecting clients (2.5 seconds)
    echo "retry: 2500\n\n";
    @flush();

    $startTime = time();
    $currentLastId = $lastEventId;

    // Check immediately for any events missed while disconnected
    $initialEvents = getRecentEventsAfter($currentLastId);
    if (!empty($initialEvents)) {
        foreach (array_reverse($initialEvents) as $ev) {
            $evId = (float)($ev['id'] ?? 0);
            if ($evId > $currentLastId) $currentLastId = $evId;
            echo "id: {$evId}\n";
            echo "event: " . ($ev['type'] ?? 'message') . "\n";
            echo "data: " . json_encode($ev, JSON_UNESCAPED_SLASHES) . "\n\n";
        }
        @flush();
    }

    // Keep SSE channel open for up to 25 seconds, streaming new events instantly
    while ((time() - $startTime) < 25 && !connection_aborted()) {
        $newEvents = getRecentEventsAfter($currentLastId);
        if (!empty($newEvents)) {
            foreach (array_reverse($newEvents) as $ev) {
                $evId = (float)($ev['id'] ?? 0);
                if ($evId > $currentLastId) $currentLastId = $evId;
                echo "id: {$evId}\n";
                echo "event: " . ($ev['type'] ?? 'message') . "\n";
                echo "data: " . json_encode($ev, JSON_UNESCAPED_SLASHES) . "\n\n";
            }
            @flush();
        }

        // Heartbeat comment every 10 seconds to keep connection alive
        echo ": ping " . time() . "\n\n";
        @flush();

        usleep(800000); // 800ms high-resolution check
    }
    exit;
}

// -------------------------------------------------------------
// MODE B: FAST JSON POLLING - 1ms instant response
// -------------------------------------------------------------
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");

$newEvents = getRecentEventsAfter($lastEventId);

echo json_encode([
    "success" => true,
    "events"  => $newEvents,
    "time"    => time()
]);
exit;
