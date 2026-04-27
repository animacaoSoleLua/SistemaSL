-- Remove o prefixo da URL pública de todas as mídias de relatório
UPDATE "report_media"
SET "url" = REPLACE("url", 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/', '')
WHERE "url" LIKE 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/%';

-- Remove o prefixo da foto de perfil dos usuários
UPDATE "users"
SET "photo_url" = REPLACE("photo_url", 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/', '')
WHERE "photo_url" LIKE 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/%';

-- Remove o prefixo do áudio dos feedbacks
UPDATE "client_feedbacks"
SET "audio_url" = REPLACE("audio_url", 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/', '')
WHERE "audio_url" LIKE 'https://pub-4711023485b646efa2969b8839c750aa.r2.dev/%';
