// Alternativa: Substituir apenas o método updatePresence
// Cole este código no PresenceService.ts substituindo o método atual

async updatePresence(userId: string, status: PresenceStatus): Promise<void> {
  try {
    // Tentar primeiro inserir
    const { error: insertError } = await supabase.from('user_presence').insert({
      user_id: userId,
      status,
      last_seen: new Date().toISOString(),
    });

    // Se der erro de duplicata, fazer update
    if (insertError && insertError.code === '23505') {
      const { error: updateError } = await supabase
        .from('user_presence')
        .update({
          status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
    } else if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar presença:', error);
  }
}