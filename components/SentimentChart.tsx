"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

interface SentimentChartProps {
  data: { label: string; value: number }[];
}

export default function SentimentChart({ data }: SentimentChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={{ stroke: 'var(--mu)', strokeWidth: 1 }}
            label={(props: any) => {
              const { x, y, textAnchor, payload, percent } = props;
              return (
                <text x={x} y={y} fill="hsl(var(--muted-foreground))" textAnchor={textAnchor} dominantBaseline="central" fontSize={12} fontWeight={500}>
                  {`${payload.label || payload.name || 'Segment'} · ${(percent * 100).toFixed(0)}%`}
                </text>
              );
            }}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="label"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name, props) => [
              `${value} Responses`, 
              props.payload.label || name || "Count"
            ]}
            contentStyle={{ borderRadius: '8px', backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
