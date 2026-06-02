<?php
require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/functions.php';

function require_login(string $role): void {
    if (empty($_SESSION['user']) || $_SESSION['user']['role'] !== $role) {
        $loginPage = $role === 'admin' ? '/admin/login.php' : '/kasir/login.php';
        redirect(BASE_URL . $loginPage);
    }
}

function current_user(): ?array {
    return $_SESSION['user'] ?? null;
}

function attempt_login(PDO $pdo, string $username, string $password, string $role): bool {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND role = ? LIMIT 1");
    $stmt->execute([$username, $role]);
    $u = $stmt->fetch();
    if ($u && password_verify($password, $u['password'])) {
        unset($u['password']);
        $_SESSION['user'] = $u;
        return true;
    }
    return false;
}

function do_logout(): void {
    unset($_SESSION['user']);
    session_destroy();
}
