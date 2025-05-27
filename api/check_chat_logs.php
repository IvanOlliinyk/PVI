<?php
header('Content-Type: text/plain');

// Check if log file exists
$logFile = __DIR__ . '/../logs/chat_debug.log';
if (!file_exists($logFile)) {
    echo "Log file does not exist";
    exit;
}

// Read last 50 lines of log
$lines = file($logFile);
$lastLines = array_slice($lines, -50); // Get last 50 lines

echo "=== CHAT DEBUG LOG (LAST 50 ENTRIES) ===\n\n";
echo implode("", $lastLines);
echo "\n\n=== END OF LOG ===";
?>