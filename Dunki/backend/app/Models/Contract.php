<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    protected $fillable = [
        'user_id',
        'job_title',
        'destination_country',
        'agency_name',
        'salary_amount',
        'salary_currency',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
