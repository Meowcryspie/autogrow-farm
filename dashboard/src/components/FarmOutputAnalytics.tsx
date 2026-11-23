import React, { useState } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Plus, 
  Download, 
  Scale, 
  CheckCircle2, 
  Filter, 
  Sparkles,
  Award,
  Droplets,
  X
} from 'lucide-react';

interface HarvestBatch {
  id: string;
  batchCode: string;
  facility: string;
  crop: string;
  variety: string;
  harvestDate: string;
  cycleDays: number;
  totalKg: number;
  areaSqM: number;
  yieldDensity: number; // kg/m²
  gradeAPercent: number; // %
  avgBrix: number; // °Bx
  avgEc: number; // mS/cm
  avgPh: number; // pH
  waterPerKg: number; // L/kg
  nutrientsPerKg: number; // g/kg
  notes: string;
}

export const FarmOutputAnalytics: React.FC = () => {
  const [batches, setBatches] = useState<HarvestBatch[]>([
    {
      id: 'batch-03',
      batchCode: '2026-B03-TOM',
      facility: 'Venlo Bay 01 (Peaked Glasshouse)',
      crop: 'Vine Tomatoes',
      variety: 'Campari F1',
      harvestDate: '2026-05-18',
      cycleDays: 84,
      totalKg: 15300,
      areaSqM: 250,
      yieldDensity: 61.2,
      gradeAPercent: 95.4,
      avgBrix: 8.4,
      avgEc: 2.52,
      avgPh: 5.78,
      waterPerKg: 21.8,
      nutrientsPerKg: 3.08,
      notes: 'Generative steering applied with diurnal EC elevation (2.6 mS/cm mid-day). Highest BRIX recorded.'
    },
    {
      id: 'batch-02',
      batchCode: '2026-B02-TOM',
      facility: 'Venlo Bay 01 (Peaked Glasshouse)',
      crop: 'Vine Tomatoes',
      variety: 'Campari F1',
      harvestDate: '2026-02-22',
      cycleDays: 88,
      totalKg: 13700,
      areaSqM: 250,
      yieldDensity: 54.8,
      gradeAPercent: 92.1,
      avgBrix: 7.9,
      avgEc: 2.22,
      avgPh: 5.86,
      waterPerKg: 24.5,
      nutrientsPerKg: 3.42,
      notes: 'Balanced steering with moderate vegetative growth. Early spring lower solar radiation.'
    },
    {
      id: 'batch-01',
      batchCode: '2026-B01-TOM',
      facility: 'Venlo Bay 01 (Peaked Glasshouse)',
      crop: 'Vine Tomatoes',
      variety: 'Campari F1',
      harvestDate: '2025-11-28',
      cycleDays: 92,
      totalKg: 11900,
      areaSqM: 250,
      yieldDensity: 47.6,
      gradeAPercent: 88.5,
      avgBrix: 7.2,
      avgEc: 1.85,
      avgPh: 6.05,
      waterPerKg: 28.2,
      nutrientsPerKg: 3.95,
      notes: 'Baseline recipe. Low EC resulted in higher vegetative mass and lower fruit density.'
    },
    {
      id: 'batch-04',
      batchCode: '2026-G01-LET',
      facility: 'Hydroponic Gutter Beds (Zone 02)',
      crop: 'Crisphead Lettuce',
      variety: 'Salanova Butterhead',
      harvestDate: '2026-05-12',
      cycleDays: 28,
      totalKg: 4200,
      areaSqM: 120,
      yieldDensity: 35.0,
      gradeAPercent: 96.8,
      avgBrix: 4.6,
      avgEc: 1.62,
      avgPh: 5.92,
      waterPerKg: 14.2,
      nutrientsPerKg: 1.85,
      notes: 'NFT continuous flow. Rapid cycle turnaround with 0 tip-burn instances.'
    },
    {
      id: 'batch-05',
      batchCode: '2025-Q4-PEP',
      facility: 'Venlo Bay 02 (Substrate Slabs)',
      crop: 'Bell Peppers',
      variety: 'Red Blocky Canon',
      harvestDate: '2025-10-14',
      cycleDays: 105,
      totalKg: 9550,
      areaSqM: 250,
      yieldDensity: 38.2,
      gradeAPercent: 91.0,
      avgBrix: 6.8,
      avgEc: 2.10,
      avgPh: 5.85,
      waterPerKg: 26.0,
      nutrientsPerKg: 3.60,
      notes: 'High calcium feed schedule mitigated blossom-end rot (BER) during August heat.'
    }
  ]);

  const [selectedCrop, setSelectedCrop] = useState<string>('All');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // New batch form state
  const [newBatchCode, setNewBatchCode] = useState('');
  const [newCrop, setNewCrop] = useState('Vine Tomatoes');
  const [newVariety, setNewVariety] = useState('Campari F1');
  const [newFacility, setNewFacility] = useState('Venlo Bay 01 (Peaked Glasshouse)');
  const [newTotalKg, setNewTotalKg] = useState('14500');
  const [newAreaSqM, setNewAreaSqM] = useState('250');
  const [newGradeAPercent, setNewGradeAPercent] = useState('94.5');
  const [newBrix, setNewBrix] = useState('8.2');
  const [newAvgEc, setNewAvgEc] = useState('2.45');
  const [newNotes, setNewNotes] = useState('');

  const filteredBatches = selectedCrop === 'All' 
    ? batches 
    : batches.filter(b => b.crop.toLowerCase().includes(selectedCrop.toLowerCase()));

  // Aggregate Metrics
  const totalWeightKg = filteredBatches.reduce((sum, b) => sum + b.totalKg, 0);
  const avgYieldDensity = (filteredBatches.reduce((sum, b) => sum + b.yieldDensity, 0) / (filteredBatches.length || 1)).toFixed(1);
  const avgGradeA = (filteredBatches.reduce((sum, b) => sum + b.gradeAPercent, 0) / (filteredBatches.length || 1)).toFixed(1);
  const avgBrixScore = (filteredBatches.reduce((sum, b) => sum + b.avgBrix, 0) / (filteredBatches.length || 1)).toFixed(1);
  const avgWaterEff = (filteredBatches.reduce((sum, b) => sum + b.waterPerKg, 0) / (filteredBatches.length || 1)).toFixed(1);

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(newTotalKg) || 10000;
    const area = parseFloat(newAreaSqM) || 250;
    const density = parseFloat((kg / area).toFixed(1));
    const gradeA = parseFloat(newGradeAPercent) || 92;
    const brix = parseFloat(newBrix) || 7.5;
    const ec = parseFloat(newAvgEc) || 2.2;

    const newEntry: HarvestBatch = {
      id: `batch-${Date.now()}`,
      batchCode: newBatchCode || `2026-B0${batches.length + 1}-MAN`,
      facility: newFacility,
      crop: newCrop,
      variety: newVariety || 'Standard Commercial F1',
      harvestDate: new Date().toISOString().split('T')[0],
      cycleDays: 80,
      totalKg: kg,
      areaSqM: area,
      yieldDensity: density,
      gradeAPercent: gradeA,
      avgBrix: brix,
      avgEc: ec,
      avgPh: 5.80,
      waterPerKg: 22.5,
      nutrientsPerKg: 3.15,
      notes: newNotes || 'Direct operator harvest record.'
    };

    setBatches([newEntry, ...batches]);
    setIsLogModalOpen(false);
    // Reset
    setNewBatchCode('');
    setNewNotes('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Control Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '20px 24px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: '6px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '4px',
              color: '#10B981',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700
            }}>
              <TrendingUp size={12} />
              CEA PRODUCTION INTELLIGENCE
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              UPDATED TODAY
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
            Farm Output & Harvest Analytics
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Correlate crop biomass yield, Grade-A packout %, and BRIX soluble solids against historical fertigation & climate recipes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Crop Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--bg-primary)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select 
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All" style={{ background: '#0F172A' }}>All Crops (Global)</option>
              <option value="Tomatoes" style={{ background: '#0F172A' }}>Vine Tomatoes</option>
              <option value="Lettuce" style={{ background: '#0F172A' }}>Crisphead Lettuce</option>
              <option value="Peppers" style={{ background: '#0F172A' }}>Bell Peppers</option>
            </select>
          </div>

          {/* Log Harvest Button */}
          <button
            onClick={() => setIsLogModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#10B981',
              color: '#070B14',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={15} />
            Log New Harvest Batch
          </button>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* Total Yield Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '6px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cumulative Harvest
            </span>
            <Scale size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
            {totalWeightKg.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dim)' }}>kg</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={13} />
            <span>+18.4% vs Previous Year Season</span>
          </div>
        </div>

        {/* Biomass Density Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '6px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Yield Density Mean
            </span>
            <BarChart3 size={16} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
            {avgYieldDensity} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dim)' }}>kg / m²</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Benchmark Target: 52.0 kg/m²
          </div>
        </div>

        {/* Grade-A Packout Ratio Card */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '6px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Grade-A Market Packout
            </span>
            <Award size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
            {avgGradeA} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dim)' }}>%</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={13} />
            <span>Top Tier Premium Grade Margin</span>
          </div>
        </div>

        {/* Average BRIX Score */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '6px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mean Sugar Index
            </span>
            <Sparkles size={16} color="#EC4899" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
            {avgBrixScore} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dim)' }}>°Bx</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>
            Elevated by diurnal EC pulsing
          </div>
        </div>

        {/* Water Use Efficiency */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '6px',
          padding: '18px 20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Water Efficiency (WUE)
            </span>
            <Droplets size={16} color="#3B82F6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
            {avgWaterEff} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dim)' }}>L / kg</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#10B981' }}>
            -18% water vs open field (250 L/kg)
          </div>
        </div>
      </div>

      {/* Yield Correlation & Scientific Findings Panel */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: '6px',
        padding: '20px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={18} color="#10B981" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            Empirical Output Findings & Fertigation Insights
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '4px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                EC STEERING vs. BIOMASS DENSITY
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              Analysis of Batches <strong>2026-B01</strong> through <strong>2026-B03</strong> demonstrates that increasing EC setpoint from <strong>1.85 to 2.52 mS/cm</strong> during generative flowering produced a <strong>+28.5% increase in fruit biomass density (47.6 → 61.2 kg/m²)</strong> with 0 blossom-end rot incidence.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '4px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                RHIZOSPHERE pH STABILITY & NUTRIENT UPTAKE
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              Holding substrate runoff pH rigidly between <strong>5.75 – 5.85</strong> via closed-loop PID acid injection prevented micro-nutrient lockout (Iron and Manganese), elevating Grade-A fruit qualification to an all-time high of <strong>95.4%</strong>.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '4px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EC4899' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
                SUGAR ACCUMULATION (BRIX °Bx)
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
              Correlating high afternoon solar radiation (&gt;18 MJ/m²) with a daytime VPD target of <strong>1.15 kPa</strong> drove transpirational suction, boosting mean soluble solids from <strong>7.2° Bx to 8.4° Bx</strong>, securing premium retail pricing.
            </p>
          </div>
        </div>
      </div>

      {/* Historical Harvest Batches Master Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Batch Production History & Sensor Correlation Ledger
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Showing {filteredBatches.length} recorded harvests across all active zones
            </span>
          </div>

          <button
            onClick={() => {
              const csvContent = 'data:text/csv;charset=utf-8,' + 
                'BatchCode,Facility,Crop,HarvestDate,TotalKg,YieldDensityKgM2,GradeAPercent,Brix,AvgEC,AvgPH\n' +
                filteredBatches.map(b => `${b.batchCode},${b.facility},${b.crop},${b.harvestDate},${b.totalKg},${b.yieldDensity},${b.gradeAPercent},${b.avgBrix},${b.avgEc},${b.avgPh}`).join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `autogrow-farm-yield-report-${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-hairline)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            Export Spec Sheet (CSV)
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-hairline)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Batch Code</th>
                <th style={{ padding: '12px 16px' }}>Facility / Zone</th>
                <th style={{ padding: '12px 16px' }}>Crop & Variety</th>
                <th style={{ padding: '12px 16px' }}>Harvest Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Kg</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Yield Density</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Grade-A %</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>BRIX °Bx</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Mean EC</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Mean pH</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map((batch, idx) => (
                <tr 
                  key={batch.id}
                  style={{
                    borderBottom: '1px solid var(--border-hairline)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38BDF8' }}>
                    {batch.batchCode}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                    {batch.facility}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#FFFFFF', fontWeight: 600 }}>
                    {batch.crop}
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 400 }}>{batch.variety}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                    {batch.harvestDate}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#FFFFFF' }}>
                    {batch.totalKg.toLocaleString()} kg
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#10B981' }}>
                    {batch.yieldDensity} kg/m²
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#F59E0B', fontWeight: 700 }}>
                    {batch.gradeAPercent}%
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#EC4899', fontWeight: 700 }}>
                    {batch.avgBrix}°
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#10B981' }}>
                    {batch.avgEc} mS
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#38BDF8' }}>
                    {batch.avgPh}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Harvest Modal */}
      {isLogModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '540px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--bg-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#10B981" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  Record Fresh Harvest Output
                </h3>
              </div>
              <button 
                onClick={() => setIsLogModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBatch} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    FACILITY / BAY
                  </label>
                  <input
                    type="text"
                    value={newFacility}
                    onChange={(e) => setNewFacility(e.target.value)}
                    placeholder="e.g. Venlo Bay 01"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    VARIETY
                  </label>
                  <input
                    type="text"
                    value={newVariety}
                    onChange={(e) => setNewVariety(e.target.value)}
                    placeholder="e.g. Campari F1"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    BATCH IDENTIFIER
                  </label>
                  <input
                    type="text"
                    value={newBatchCode}
                    onChange={(e) => setNewBatchCode(e.target.value)}
                    placeholder="e.g. 2026-B04-TOM"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    CROP TYPE
                  </label>
                  <select
                    value={newCrop}
                    onChange={(e) => setNewCrop(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Vine Tomatoes">Vine Tomatoes</option>
                    <option value="Crisphead Lettuce">Crisphead Lettuce</option>
                    <option value="Bell Peppers">Bell Peppers</option>
                    <option value="Strawberries">Strawberries</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    TOTAL HARVEST (KG)
                  </label>
                  <input
                    type="number"
                    value={newTotalKg}
                    onChange={(e) => setNewTotalKg(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    BAY AREA (M²)
                  </label>
                  <input
                    type="number"
                    value={newAreaSqM}
                    onChange={(e) => setNewAreaSqM(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    GRADE-A (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newGradeAPercent}
                    onChange={(e) => setNewGradeAPercent(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    BRIX (°Bx)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newBrix}
                    onChange={(e) => setNewBrix(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    AVG EC (mS/cm)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={newAvgEc}
                    onChange={(e) => setNewAvgEc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: '4px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  OPERATOR OBSERVATIONS & AGRONOMIC NOTES
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Notes on vegetative vigour, blossom condition, or climate events..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: '4px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontFamily: 'var(--font-sans)',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-muted)',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#10B981',
                    color: '#070B14',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Harvest Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
