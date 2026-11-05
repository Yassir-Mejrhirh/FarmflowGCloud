import { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getActiveCompanyId, setActiveCompanyId, adoptUnassignedRecords } from '@/lib/companyScope';

const CompanyContext = createContext(null);

export function useCompany() {
  return useContext(CompanyContext);
}

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [activeId, setActiveId] = useState(getActiveCompanyId);

  useEffect(() => {
    let alive = true;
    base44.entities.Company.list('-created_date').then((list) => {
      if (!alive) return;
      setCompanies(list);
      if (!getActiveCompanyId() && list.length) {
        setActiveCompanyId(list[0].id);
        window.location.reload();
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectCompany = (id) => {
    if (id === getActiveCompanyId()) return;
    setActiveCompanyId(id);
    setActiveId(id);
    window.location.reload();
  };

  const createCompany = async (name) => {
    const created = await base44.entities.Company.create({ name });
    if (!companies.length) await adoptUnassignedRecords(created.id);
    setActiveCompanyId(created.id);
    window.location.reload();
  };

  const value = {
    companies,
    activeCompany: companies.find((company) => company.id === activeId) || null,
    selectCompany,
    createCompany,
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}