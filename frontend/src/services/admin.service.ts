import api from "@/lib/Api";

export interface SystemConfig {
  key: string;
  value: unknown;
  type: string;
  category: string;
  description?: string;
}

export const AdminService = {
  async getConfigs(): Promise<SystemConfig[]> {
    const { data } = await api.get("/admin/configs");
    return data.configs;
  },

  async updateConfig(key: string, value: unknown): Promise<SystemConfig> {
    const { data } = await api.put(`/admin/configs/${key}`, { config_value: value });
    return data;
  },
};
