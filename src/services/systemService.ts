import { supabase } from './supabase';

export interface SystemSettings {
    enabled: boolean;
}

export const systemService = {
    /**
     * Verifica se o sistema está ativo (gera sinais técnicos)
     * Quando desativado, só gera sinais do admin
     */
    async isSystemEnabled(): Promise<boolean> {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'system_enabled')
                .single();

            if (error) {
                console.error('Error checking system status:', error);
                return true; // Em caso de erro, assume que está ativo
            }

            return data?.value?.enabled ?? true;
        } catch (error) {
            console.error('Error checking system status:', error);
            return true;
        }
    },

    /**
     * Ativa ou desativa o sistema
     */
    async setSystemEnabled(enabled: boolean): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('system_settings')
                .update({
                    value: { enabled },
                    updated_at: new Date().toISOString()
                })
                .eq('key', 'system_enabled');

            if (error) {
                console.error('Error updating system status:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error updating system status:', error);
            return false;
        }
    },

    /**
     * Subscribe para mudanças em tempo real nas configurações do sistema
     */
    subscribeToSystemSettings(callback: (enabled: boolean) => void) {
        const channel = supabase
            .channel('system-settings-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'system_settings',
                filter: 'key=eq.system_enabled'
            }, (payload) => {
                const newValue = (payload.new as any)?.value;
                if (newValue !== undefined) {
                    callback(newValue.enabled ?? true);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};

