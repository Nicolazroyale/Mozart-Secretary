<?php
echo "Testing directory contents...\n";
echo "__DIR__ is: " . __DIR__ . "\n";
echo "Contents of /var/www/html:\n";
print_r(scandir('/var/www/html'));
echo "\nContents of /var/www/html/Login:\n";
if (is_dir('/var/www/html/Login')) {
    print_r(scandir('/var/www/html/Login'));
} else {
    echo "Not a directory\n";
}
echo "\nTrying to check file_exists for /var/www/html/Login/auth_config.php: ";
var_dump(file_exists('/var/www/html/Login/auth_config.php'));

echo "\nTrying to check realpath('/var/www/html/sistema/../Login/auth_config.php'): ";
var_dump(realpath('/var/www/html/sistema/../Login/auth_config.php'));

echo "\nChecking file permissions for /var/www/html/Login:\n";
var_dump(fileperms('/var/www/html/Login'));
echo "\nChecking owner/group of /var/www/html/Login:\n";
var_dump(posix_getpwuid(fileowner('/var/www/html/Login')));
?>