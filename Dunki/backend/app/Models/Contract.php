<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    protected $fillable = [
        'user_id',
        'agency_id',
        'job_title',
        'destination_country',
        'agency_name',
        'salary_amount',
        'salary_currency',
        'status',
        'contract_terms',
    ];

    protected $casts = [
        'salary_amount' => 'float',
    ];

    /**
     * The migrant worker this contract is issued to.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Alias for worker.
     */
    public function worker()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The recruiting agency that issued this contract.
     */
    public function agency()
    {
        return $this->belongsTo(User::class, 'agency_id');
    }
}
