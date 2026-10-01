export type UserRow = {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function findUserByGoogleId(
  db: D1Database,
  googleId: string,
): Promise<UserRow | null> {
  return db
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .bind(googleId)
    .first<UserRow>();
}

export async function findUserById(
  db: D1Database,
  id: string,
): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export async function findUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow | null> {
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<UserRow>();
}

export async function insertUser(
  db: D1Database,
  user: UserRow,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, google_id, email, name, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      user.id,
      user.google_id,
      user.email,
      user.name,
      user.avatar_url,
      user.created_at,
      user.updated_at,
    )
    .run();
}

export async function updateUser(
  db: D1Database,
  id: string,
  fields: Pick<UserRow, "email" | "name" | "avatar_url" | "updated_at">,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(fields.email, fields.name, fields.avatar_url, fields.updated_at, id)
    .run();
}
