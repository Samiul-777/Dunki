<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    // app/Models/JobApplication.php
    protected $fillable = [
        'job_listing_id',
        'applicant_id',
        'document_path',
        'note',
        'status',
    ];

    public function job()
    {
        return $this->belongsTo(JobListing::class, 'job_listing_id');
    }

    public function applicant()
    {
        return $this->belongsTo(User::class, 'applicant_id');
    }
}
