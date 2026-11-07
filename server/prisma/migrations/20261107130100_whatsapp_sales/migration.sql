ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT '';
UPDATE "Order" o SET "paymentMethod" = COALESCE((SELECT p."provider" FROM "Payment" p WHERE p."orderId" = o."id" ORDER BY p."createdAt", p."id" LIMIT 1), '');
UPDATE "Order" SET "orderStatus" = 'CONFIRMED' WHERE "orderStatus" IN ('AWAITING_PAYMENT', 'PAID_AWAITING_PROCESSING');
ALTER TABLE "Order" ALTER COLUMN "orderStatus" SET DEFAULT 'CONFIRMED';
UPDATE "StorePage" SET "content" = replace("content", 'Uma compra só entra no faturamento quando o pagamento for confirmado. O pedido pendente não é uma venda.', 'O pedido confirmado para envio ao WhatsApp conta como venda, exceto se for cancelado. O site registra a forma de pagamento escolhida, sem processar nem verificar pagamentos.');
