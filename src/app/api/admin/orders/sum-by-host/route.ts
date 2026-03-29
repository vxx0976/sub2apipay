import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminToken, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request))) return unauthorizedResponse();

  const body = await request.json();
  const hosts: string[] = body.hosts;

  if (!Array.isArray(hosts) || hosts.length === 0) {
    return NextResponse.json({ error: 'hosts array is required' }, { status: 400 });
  }

  const results = await prisma.order.groupBy({
    by: ['srcHost'],
    where: {
      srcHost: { in: hosts },
      status: { in: ['PAID', 'RECHARGING', 'COMPLETED'] },
    },
    _sum: { amount: true },
  });

  const totals: Record<string, number> = {};
  for (const host of hosts) {
    totals[host] = 0;
  }
  for (const row of results) {
    if (row.srcHost) {
      totals[row.srcHost] = Number(row._sum.amount) || 0;
    }
  }

  return NextResponse.json({ totals });
}
