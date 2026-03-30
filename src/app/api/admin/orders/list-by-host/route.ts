import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminToken, unauthorizedResponse } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  if (!(await verifyAdminToken(request))) return unauthorizedResponse();

  const body = await request.json();
  const hosts: string[] = body.hosts;
  const page = Math.max(1, Number(body.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(body.page_size || 20)));

  if (!Array.isArray(hosts) || hosts.length === 0) {
    return NextResponse.json({ error: 'hosts array is required' }, { status: 400 });
  }

  const where = {
    srcHost: { in: hosts },
    status: { in: ['PAID' as const, 'RECHARGING' as const, 'COMPLETED' as const] },
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        userEmail: true,
        amount: true,
        status: true,
        paidAt: true,
        srcHost: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({
    orders: orders.map((o) => ({
      ...o,
      amount: Number(o.amount),
    })),
    total,
    page,
    page_size: pageSize,
  });
}
