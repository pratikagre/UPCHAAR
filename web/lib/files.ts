import { supabase } from "@/lib/supabaseClient";

/**
 * Fetches files of a user profile (paginated).
 *
 * @param userProfileId
 * @param page default 1
 */
export async function fetchUserFiles(userProfileId: string, page: number = 1) {
  const start = (page - 1) * 50;
  const end = start + 49;

  const { data, error, count } = await supabase
    .from("files")
    .select("*", { count: "exact" })
    .eq("user_profile_id", userProfileId)
    .order("uploaded_at", { ascending: false })
    .range(start, end);

  if (error) throw error;

  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Upload file to storage and insert record into "files" table.
 */
export async function uploadUserFile(
  file: File,
  userProfileId: string,
) {
  const fileExt = file.name.split(".").pop() || "file";
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userProfileId}/${fileName}`;

  // ✅ Upload
  const { error: storageError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (storageError) throw storageError;

  // ✅ public url
  const { data: publicUrlData } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  const fileUrl = publicUrlData.publicUrl;

  // ✅ Insert DB
  const { data, error } = await supabase
    .from("files")
    .insert({
      user_profile_id: userProfileId,
      filename: file.name,
      url: fileUrl,
      uploaded_at: new Date().toISOString(),
      // tags: [],
    })
    .select("*")
    .single();

  if (error) throw error;

  return data;
}
