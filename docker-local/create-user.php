<?php
/**
 * Create (or reset) a local dev user for MateCat email/password login,
 * including the "Personal" team + membership that signup normally creates
 * (without it, /api/app/project-template/default 500s and the create form hangs).
 *
 * Run inside the app container:
 *   docker compose exec app php docker-local/create-user.php [email] [password] [firstName] [lastName]
 *
 * Dev only. Uses MateCat's own hashing (Utils::encryptPass) and DAOs.
 */

require __DIR__ . '/../lib/Bootstrap.php';
Bootstrap::start();

use Utils\Tools\Utils;
use Model\Users\UserDao;
use Model\Teams\TeamDao;

$email    = $argv[1] ?? 'test@matecat.local';
$password = $argv[2] ?? 'test1234';
$first    = $argv[3] ?? 'Test';
$last     = $argv[4] ?? 'User';

$salt = Utils::randomString(32);
$pass = Utils::encryptPass($password, $salt);

$db  = Bootstrap::getDatabase();
$pdo = $db->getConnection();

// 1) user row (with salt+hash + confirmed email so LoginController accepts it)
$stmt = $pdo->prepare(
    "INSERT INTO users (email, salt, pass, create_date, first_name, last_name, email_confirmed_at)
     VALUES (:email, :salt, :pass, NOW(), :first, :last, NOW())
     ON DUPLICATE KEY UPDATE
        salt = VALUES(salt), pass = VALUES(pass),
        first_name = VALUES(first_name), last_name = VALUES(last_name),
        email_confirmed_at = VALUES(email_confirmed_at)"
);
$stmt->execute([
    ':email' => $email, ':salt' => $salt, ':pass' => $pass,
    ':first' => $first, ':last' => $last,
]);

$userDao = new UserDao($db);
$userDao->destroyCacheByEmail($email);
$user = $userDao->getByEmail($email);
if (!$user || $user->uid === null) {
    fwrite(STDERR, "ERROR: could not load user after insert\n");
    exit(1);
}

// 2) Personal team + membership (as SignupModel does), if missing
$teamDao = new TeamDao($db);
$hasTeam = true;
try {
    $teamDao->getPersonalByUid((int)$user->uid);
} catch (\Throwable $e) {
    $hasTeam = false;
}
if (!$hasTeam) {
    $db->transaction(fn() => $teamDao->createPersonalTeam($user));
    $teamDao->destroyCachePersonalByUid((int)$user->uid);
}

echo "OK — login ready:\n";
echo "  email:         {$email}\n";
echo "  password:      {$password}\n";
echo "  uid:           {$user->uid}\n";
echo "  personal team: " . ($hasTeam ? "existed" : "created") . "\n";
