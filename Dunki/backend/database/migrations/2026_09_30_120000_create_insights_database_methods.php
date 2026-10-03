<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('job_application_status_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('application_id');
            $table->unsignedBigInteger('applicant_id')->nullable();
            $table->unsignedBigInteger('job_listing_id')->nullable();
            $table->string('old_status');
            $table->string('new_status');
            $table->timestamp('changed_at')->useCurrent();
            $table->index('changed_at');
        });

        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::unprepared('DROP TRIGGER IF EXISTS trg_job_application_status_history');
        DB::unprepared('DROP PROCEDURE IF EXISTS sp_dunki_destination_summary');

        DB::unprepared(<<<'SQL'
CREATE OR REPLACE VIEW v_dunki_application_overview AS
SELECT
    ja.id,
    ja.status,
    ja.created_at,
    applicant.name AS applicant_name,
    job.title AS job_title,
    job.country AS destination,
    COALESCE(NULLIF(job.agency, ''), agency.agency, agency.name) AS agency_name
FROM job_applications AS ja
JOIN users AS applicant ON applicant.id = ja.applicant_id
JOIN jobs_listings AS job ON job.id = ja.job_listing_id
LEFT JOIN users AS agency ON agency.id = job.creator_id
SQL);

        DB::unprepared(<<<'SQL'
CREATE PROCEDURE sp_dunki_destination_summary()
BEGIN
    SELECT
        COALESCE(NULLIF(job.country, ''), 'Unknown') AS destination,
        COUNT(DISTINCT job.id) AS job_count,
        COUNT(ja.id) AS application_count,
        COUNT(DISTINCT CASE WHEN job.verified = 1 THEN job.id END) AS verified_job_count
    FROM jobs_listings AS job
    LEFT JOIN job_applications AS ja ON ja.job_listing_id = job.id
    GROUP BY COALESCE(NULLIF(job.country, ''), 'Unknown')
    ORDER BY job_count DESC, destination ASC;
END
SQL);

        DB::unprepared(<<<'SQL'
CREATE TRIGGER trg_job_application_status_history
AFTER UPDATE ON job_applications
FOR EACH ROW
BEGIN
    IF NOT (OLD.status <=> NEW.status) THEN
        INSERT INTO job_application_status_history
            (application_id, applicant_id, job_listing_id, old_status, new_status, changed_at)
        VALUES
            (OLD.id, OLD.applicant_id, OLD.job_listing_id, OLD.status, NEW.status, CURRENT_TIMESTAMP);
    END IF;
END
SQL);
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::unprepared('DROP TRIGGER IF EXISTS trg_job_application_status_history');
            DB::unprepared('DROP PROCEDURE IF EXISTS sp_dunki_destination_summary');
            DB::unprepared('DROP VIEW IF EXISTS v_dunki_application_overview');
        }

        Schema::dropIfExists('job_application_status_history');
    }
};
