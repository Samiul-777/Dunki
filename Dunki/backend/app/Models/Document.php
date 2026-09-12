<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'status',
        'file_path',
        'type',
    ];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        return url('storage/' . $this->file_path);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
