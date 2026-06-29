<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['table'] = 'cursos';
$_GET['format'] = 'excel';
ob_start();
require __DIR__ . '/api.php';
$output = ob_get_clean();
file_put_contents('/tmp/test_export.xlsx', $output);
echo "Saved to /tmp/test_export.xlsx! Size in bytes: " . strlen($output) . "\n";
?>
