import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export interface DynamicCategory {
  id: number;
  code: string;
  level_name: string;
  name: string;
  short_name: string;
  default_questions: number;
  default_duration: number;
  passing_score: number;
  image_uri: string | null;
}

export interface DynamicLevel {
  id: number;
  level_name: string;
  description: string;
  color: string;
  light_color: string;
  icon: string;
  image_uri: string | null;
  categories: DynamicCategory[];
}

interface BankTypeContextType {
  levels: DynamicLevel[];
  isReady: boolean;
  reloadBankTypes: () => Promise<void>;
  getLevelByCategory: (categoryCode: string) => DynamicLevel | undefined;
  getCategoryByCode: (categoryCode: string) => DynamicCategory | undefined;
  getLevelColor: (levelName: string) => string;
}

const BankTypeContext = createContext<BankTypeContextType | undefined>(undefined);

export const BankTypeProvider = ({ children }: { children: ReactNode }) => {
  const db = useSQLiteContext();
  const [levels, setLevels] = useState<DynamicLevel[]>([]);
  const [isReady, setIsReady] = useState(false);

  const reloadBankTypes = async () => {
    try {
      const levelsData = await db.getAllAsync<any>('SELECT * FROM levels ORDER BY id ASC');
      const categoriesData = await db.getAllAsync<any>('SELECT * FROM categories ORDER BY id ASC');

      const mappedLevels: DynamicLevel[] = levelsData.map(l => ({
        id: l.id,
        level_name: l.level_name,
        description: l.description,
        color: l.color,
        light_color: l.light_color,
        icon: l.icon,
        image_uri: l.image_uri,
        categories: categoriesData.filter(c => c.level_name === l.level_name).map(c => ({
          id: c.id,
          code: c.code,
          level_name: c.level_name,
          name: c.name,
          short_name: c.short_name,
          default_questions: c.default_questions,
          default_duration: c.default_duration,
          passing_score: c.passing_score,
          image_uri: c.image_uri,
        }))
      }));

      setLevels(mappedLevels);
      setIsReady(true);
    } catch (error) {
      console.error('Failed to load bank types:', error);
      setIsReady(true); // Always ready to avoid blocking
    }
  };

  useEffect(() => {
    reloadBankTypes();
  }, []);

  const getLevelByCategory = (categoryCode: string) => {
    return levels.find(l => l.categories.some(c => c.code === categoryCode));
  };

  const getCategoryByCode = (categoryCode: string) => {
    for (const level of levels) {
      const cat = level.categories.find(c => c.code === categoryCode);
      if (cat) return cat;
    }
    return undefined;
  };

  const getLevelColor = (levelName: string) => {
    const level = levels.find(l => l.level_name === levelName);
    return level?.color ?? '#1565C0';
  };

  return (
    <BankTypeContext.Provider value={{ levels, isReady, reloadBankTypes, getLevelByCategory, getCategoryByCode, getLevelColor }}>
      {children}
    </BankTypeContext.Provider>
  );
};

export const useBankTypes = () => {
  const context = useContext(BankTypeContext);
  if (!context) throw new Error('useBankTypes must be used within BankTypeProvider');
  return context;
};
