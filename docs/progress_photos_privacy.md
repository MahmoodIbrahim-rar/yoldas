# Progress Photos Privacy Design

Progress photos are sensitive user-owned media. The implementation will create a **private** Supabase Storage bucket rather than a public image URL. Each file path will begin with the authenticated user ID, and the storage policies will permit upload, view, update, and deletion only when that first folder matches the authenticated user.

The app will store only file metadata, capture date, optional private note, and storage path in the user-owned database table. It will not post photos to the community, create share links by default, use them to generate health claims, or run automatic image analysis.

The design follows Supabase Storage guidance that private buckets are subject to RLS for download operations and that object paths can be restricted by the authenticated user’s folder. [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) [Supabase Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
