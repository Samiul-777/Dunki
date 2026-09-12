<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobListing extends Model
{
    protected $table = 'jobs_listings';

    // app/Models/JobListing.php
    protected $fillable = [
        'creator_id',
        'title',
        'description',
        'criteria',
        'country',
        'city',
        'salary',
        'agency',
        'verified',
    ];

    protected function casts(): array
    {
        return ['verified' => 'boolean'];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }
}
